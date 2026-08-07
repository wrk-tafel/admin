package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.postgresql.PGConnection
import org.postgresql.PGNotification
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.sql.DriverManager
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Holds a single dedicated JDBC connection issuing Postgres `LISTEN sse_outbox`, and fans out
 * incoming `NOTIFY` payloads (JSON-encoded [SseOutboxNotificationEvent]) to callbacks registered
 * by [SseOutboxService], keyed by `notificationName`.
 *
 * The listener loop runs on its own coroutine and blocks in `PGConnection.getNotifications` with
 * an effectively infinite timeout ([NOTIFICATIONS_POLL_TIMEOUT]) rather than polling - it only
 * wakes up when Postgres delivers a notification on the connection.
 *
 * The connection is opened directly via [DriverManager] instead of through the app's pooled
 * Hikari `DataSource`: since it's held open for the app's entire lifetime rather than borrowed
 * and returned promptly, going through the pool would permanently occupy one of its connections
 * and trip HikariCP's leak-detection warning. The credentials come from Spring Boot's own
 * [DataSourceProperties] rather than from `@Value` copies of `spring.datasource.*`, so there is one
 * definition of where this application's database is, not two that can drift apart.
 *
 * It reads them once, in [setupListener], and holds the resulting connection for the process's
 * lifetime - so pointing a running application at a different database is a restart, no matter that
 * the properties themselves are re-bound when the config file changes (see `ConfigFileReloadService`).
 */
@Service
class SseOutboxListenerService(
    private val dataSourceProperties: DataSourceProperties,
    private val jsonMapper: JsonMapper,
) {

    companion object {
        const val NOTIFICATIONS_POLL_TIMEOUT = Int.MAX_VALUE
        const val PG_NOTIFICATION_CHANNEL_NAME = "sse_outbox"
    }

    lateinit var notificationListenerJob: Job
    val callbacks = ConcurrentHashMap<String, CopyOnWriteArrayList<(String?) -> Unit>>()

    @PostConstruct
    fun setupListener() {
        notificationListenerJob = CoroutineScope(Dispatchers.IO).launch {
            DriverManager.getConnection(
                dataSourceProperties.url,
                dataSourceProperties.username,
                dataSourceProperties.password,
            ).use { connection ->
                listenOnConnection(connection)
                val pgConn = connection.unwrap(PGConnection::class.java)

                while (true) {
                    val notifications = pgConn.getNotifications(NOTIFICATIONS_POLL_TIMEOUT)
                    if (notifications != null) {
                        processNotifications(notifications)
                    }
                }
            }
        }
    }

    private fun processNotifications(notifications: Array<PGNotification>) {
        for (notification in notifications) {
            if (notification.parameter != null) {
                val event = jsonMapper.readValue(
                    notification.parameter,
                    SseOutboxNotificationEvent::class.java,
                )

                callbacks[event.notificationName]?.forEach { it.invoke(event.payload) }
            }
        }
    }

    @PreDestroy
    fun cleanup() {
        notificationListenerJob.cancel()
    }

    fun registerCallback(
        notificationName: String,
        eventCallback: (payload: String?) -> Unit,
    ) {
        callbacks.computeIfAbsent(notificationName) { CopyOnWriteArrayList() }.add(eventCallback)
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
