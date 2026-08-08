package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.postgresql.PGConnection
import org.postgresql.PGNotification
import org.postgresql.PGProperty
import org.slf4j.LoggerFactory
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import java.time.Duration
import java.time.LocalDateTime
import java.util.Properties
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Holds a single dedicated JDBC connection issuing Postgres `LISTEN sse_outbox`, and fans out
 * incoming `NOTIFY` payloads (JSON-encoded [SseOutboxNotificationEvent]) to callbacks registered
 * by [SseOutboxService], keyed by `notificationName`.
 *
 * The listener loop runs on its own coroutine and spends its time blocked in
 * `PGConnection.getNotifications`, waking up either when Postgres delivers a notification or when
 * [NOTIFICATIONS_POLL_TIMEOUT] elapses. It doesn't query anything on those idle wake-ups; they exist
 * so the loop regularly gets a chance to notice things a permanently blocked read never would - a
 * connection that died without the socket ever reporting it, and a shutdown that cancelled the job.
 *
 * The connection is opened directly via [DriverManager] instead of through the app's pooled
 * Hikari `DataSource`: since it's held open for the app's entire lifetime rather than borrowed
 * and returned promptly, going through the pool would permanently occupy one of its connections
 * and trip HikariCP's leak-detection warning. The credentials come from Spring Boot's own
 * [DataSourceProperties] rather than from `@Value` copies of `spring.datasource.*`, so there is one
 * definition of where this application's database is, not two that can drift apart.
 *
 * It reads them once, in [setupListener], and every later reconnect re-uses that snapshot rather
 * than the current values - so pointing a running application at a different database stays a
 * restart, no matter that the properties themselves are re-bound when the config file changes (see
 * `ConfigFileReloadService`). Following a rebind here would be worse than ignoring it: the pooled
 * `DataSource` keeps writing outbox rows to the database it was built against, so a listener that
 * reconnected to a different one would go quiet while looking perfectly healthy.
 *
 * ## Surviving a lost connection
 *
 * This connection is a single point of failure for the whole application's server push: a database
 * restart, a failover or a network blip drops it, and with it every SSE stream goes quiet without
 * anything looking broken - browsers keep their `EventSource` open and simply never receive another
 * event. So the loop reconnects instead of ending: it re-opens the connection, re-issues `LISTEN`
 * and backs off between attempts ([RECONNECT_DELAY_MIN] doubling up to [RECONNECT_DELAY_MAX]), and
 * logs every drop at WARN so an outage is visible in `app.log` rather than silent.
 *
 * Reconnecting alone would still lose whatever was notified while the connection was down.
 * Postgres `LISTEN`/`NOTIFY` has no durable subscription - a `NOTIFY` reaches only the sessions
 * already listening when the notifying transaction commits, and a session that re-`LISTEN`s later
 * gets nothing for the time it was away. What survives is the outbox row itself, so after a
 * reconnect [replayEventsMissedWhileDisconnected] reads the rows written since the connection was
 * last known to be alive and dispatches them to the same callbacks. The watermark for that is
 * deliberately conservative (the *start* of the last poll that confirmed the connection alive), so
 * the replay overlaps rather than leaves a gap: a subscriber can see an event twice, and must not
 * miss one.
 *
 * That trade only works for events that are state - re-applying a snapshot of what is currently
 * true is a no-op, and showing a stale one is the actual harm. It is wrong for an event that reads
 * as an instruction, where a duplicate acts twice and a late delivery acts at the wrong moment, so
 * such a stream opts out at registration (`replayable = false`, see [registerCallback]) and its
 * missed events are dropped rather than delivered late.
 *
 * ## Shutting down
 *
 * [cleanup] only cancels the job and returns; the connection is closed by the reader itself, on the
 * next idle wake-up, and by nobody else. Closing it from another thread while the reader is blocked
 * on it is what hung CI for 30-90 minutes in issue #2985 - and it is just as tempting now that
 * there is a reconnect loop, which would also have to be told that this particular failure is not
 * one to retry.
 */
@Service
class SseOutboxListenerService(
    private val dataSourceProperties: DataSourceProperties,
    private val jsonMapper: JsonMapper,
    private val sseOutboxRepository: SseOutboxRepository,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(SseOutboxListenerService::class.java)

        const val NOTIFICATIONS_POLL_TIMEOUT = 10_000
        const val PG_NOTIFICATION_CHANNEL_NAME = "sse_outbox"
        const val CONNECTION_VALIDATION_TIMEOUT_SECONDS = 5
        const val CONNECTION_APPLICATION_NAME = "tafeladmin-sse-outbox-listener"

        val RECONNECT_DELAY_MIN: Duration = Duration.ofSeconds(1)
        val RECONNECT_DELAY_MAX: Duration = Duration.ofMinutes(1)

        /**
         * Caps how far back a reconnect replays. `sse_outbox` keeps two weeks of rows (see
         * [SseOutboxService.cleanupOutbox]), and pushing a whole outage's worth of superseded state
         * at every open browser helps nobody - after a few minutes the frontend's own reconnects and
         * reloads have long since re-read the current state over plain HTTP.
         */
        val REPLAY_MAX_AGE: Duration = Duration.ofMinutes(5)
    }

    lateinit var notificationListenerJob: Job
    val callbacks = ConcurrentHashMap<String, CopyOnWriteArrayList<(String?) -> Unit>>()

    /**
     * Notification names their subscribers declared unsafe to replay (see [registerCallback]).
     * A name, not a callback: whether an event survives being delivered late and twice is a
     * property of what the event *means*, so it holds for every subscriber of that name.
     */
    private val nonReplayableNotifications = ConcurrentHashMap.newKeySet<String>()

    @Volatile
    private var connectionAliveSince: LocalDateTime = LocalDateTime.now()

    @PostConstruct
    fun setupListener() {
        val connectionUrl = dataSourceProperties.url
        val connectionProperties = Properties().apply {
            dataSourceProperties.username?.let { setProperty("user", it) }
            dataSourceProperties.password?.let { setProperty("password", it) }
            // Names this one connection apart from the pool's in `pg_stat_activity`, which is
            // otherwise a wall of identical "PostgreSQL JDBC Driver" rows - it is the connection
            // worth recognising there, since it is the only long-lived one and the only one whose
            // loss takes server push down with it.
            setProperty(PGProperty.APPLICATION_NAME.getName(), CONNECTION_APPLICATION_NAME)
        }

        notificationListenerJob = CoroutineScope(Dispatchers.IO).launch {
            listenWithReconnects(connectionUrl, connectionProperties)
        }
    }

    private suspend fun listenWithReconnects(connectionUrl: String?, connectionProperties: Properties) {
        var reconnectDelay = RECONNECT_DELAY_MIN
        var connectedBefore = false

        while (currentCoroutineContext().isActive) {
            try {
                DriverManager.getConnection(connectionUrl, connectionProperties).use { connection ->
                    listenOnConnection(connection)
                    reconnectDelay = RECONNECT_DELAY_MIN

                    if (connectedBefore) {
                        logger.info("Reconnected to notification channel '$PG_NOTIFICATION_CHANNEL_NAME'")
                        // Never at the cost of the connection we just got back: a failing replay
                        // (a query timing out on a database that is still recovering) would
                        // otherwise drop us straight back into the reconnect loop.
                        runCatching { replayEventsMissedWhileDisconnected() }
                            .onFailure { logger.error("Failed to replay missed sse outbox events", it) }
                    }
                    connectedBefore = true

                    consumeNotifications(connection)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                logger.warn(
                    "Lost the connection to notification channel '$PG_NOTIFICATION_CHANNEL_NAME', " +
                        "retrying in ${reconnectDelay.toMillis()}ms - server push is down until it is back",
                    e,
                )
            }

            delay(reconnectDelay.toMillis())
            reconnectDelay = minOf(reconnectDelay.multipliedBy(2), RECONNECT_DELAY_MAX)
        }
    }

    private suspend fun consumeNotifications(connection: Connection) {
        val pgConnection = connection.unwrap(PGConnection::class.java)

        while (currentCoroutineContext().isActive) {
            // Taken before the poll, not after: an event committed while we were blocked here has an
            // event time later than this, so a replay starting from it can't skip over that event.
            val pollStartedAt = LocalDateTime.now()

            val notifications = pgConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT)
            if (!notifications.isNullOrEmpty()) {
                processNotifications(notifications)
            } else if (!connection.isValid(CONNECTION_VALIDATION_TIMEOUT_SECONDS)) {
                // An idle wake-up proves nothing on its own - a connection whose peer is gone
                // without a FIN reads as "no notifications" forever. Receiving one does, which is
                // why this only runs when nothing arrived.
                throw SQLException("Connection listening on '$PG_NOTIFICATION_CHANNEL_NAME' is no longer valid")
            }

            connectionAliveSince = pollStartedAt
        }
    }

    private fun processNotifications(notifications: Array<PGNotification>) {
        for (notification in notifications) {
            if (notification.parameter != null) {
                // One unreadable payload must not take the listener down with it: without this, a
                // single malformed notification would drop the connection and be re-read on every
                // reconnect, taking server push with it for good.
                runCatching {
                    val event = jsonMapper.readValue(
                        notification.parameter,
                        SseOutboxNotificationEvent::class.java,
                    )

                    dispatchToCallbacks(event.notificationName, event.payload)
                }.onFailure { logger.error("Failed to process notification: ${notification.parameter}", it) }
            }
        }
    }

    private fun replayEventsMissedWhileDisconnected() {
        val oldestReplayableEventTime = LocalDateTime.now().minus(REPLAY_MAX_AGE)
        val replayFrom = maxOf(connectionAliveSince, oldestReplayableEventTime)
        if (replayFrom.isAfter(connectionAliveSince)) {
            logger.warn(
                "Disconnected since {} - only replaying sse outbox events younger than {}",
                connectionAliveSince,
                REPLAY_MAX_AGE,
            )
        }

        val (skippedEvents, replayableEvents) = sseOutboxRepository
            .findAllByEventTimeAfterOrderByEventTimeAsc(replayFrom)
            .partition { nonReplayableNotifications.contains(it.notificationName) }
        if (skippedEvents.isNotEmpty()) {
            logger.warn(
                "Dropping {} event(s) of {} - they are gone rather than late, being unsafe to replay",
                skippedEvents.size,
                skippedEvents.mapNotNull { it.notificationName }.distinct(),
            )
        }
        if (replayableEvents.isEmpty()) {
            return
        }

        logger.warn("Replaying {} sse outbox event(s) recorded since {}", replayableEvents.size, replayFrom)
        replayableEvents.forEach { event ->
            runCatching { dispatchToCallbacks(event.notificationName, event.payload) }
                .onFailure { logger.error("Failed to replay sse outbox event: ${event.notificationName}", it) }
        }
    }

    private fun dispatchToCallbacks(notificationName: String?, payload: String?) {
        notificationName?.let { name -> callbacks[name]?.forEach { it.invoke(payload) } }
    }

    @PreDestroy
    fun cleanup() {
        notificationListenerJob.cancel()
    }

    /**
     * @param replayable whether this notification may also be delivered by the reconnect replay
     * (see [replayEventsMissedWhileDisconnected]). True for the state snapshots that make up most
     * of this application's server push: re-applying one is a no-op, and missing one leaves a
     * screen showing something that isn't true any more. Pass false for an event that reads as an
     * instruction rather than as state, where a duplicate does something and a late delivery does
     * the wrong thing.
     */
    fun registerCallback(
        notificationName: String,
        eventCallback: (payload: String?) -> Unit,
        replayable: Boolean = true,
    ) {
        callbacks.computeIfAbsent(notificationName) { CopyOnWriteArrayList() }.add(eventCallback)
        if (!replayable) {
            nonReplayableNotifications.add(notificationName)
        }
    }

    fun unregisterCallback(
        notificationName: String,
        eventCallback: (payload: String?) -> Unit,
    ) {
        callbacks[notificationName]?.remove(eventCallback)
    }

    private fun listenOnConnection(connection: Connection) {
        val stmt = connection.createStatement()
        stmt.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;")
        stmt.close()
    }
}

@ExcludeFromTestCoverage
data class SseOutboxNotificationEvent(
    val notificationName: String,
    val payload: String?,
)
