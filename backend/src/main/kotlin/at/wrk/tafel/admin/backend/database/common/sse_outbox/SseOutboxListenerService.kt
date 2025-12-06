package at.wrk.tafel.admin.backend.database.common.sse_outbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.postgresql.PGConnection
import org.postgresql.PGNotification
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

@Service
class SseOutboxListenerService(
    private val jdbcTemplate: JdbcTemplate,
    private val jsonMapper: JsonMapper,
) {

    companion object {
        const val NOTIFICATIONS_POLL_TIMEOUT = Int.MAX_VALUE
        const val PG_NOTIFICATION_CHANNEL_NAME = "sse_outbox"
    }

    lateinit var connection: Connection
    lateinit var notificationListenerJob: Job
    val callbacks = ConcurrentHashMap<String, CopyOnWriteArrayList<(String?) -> Unit>>()

    @PostConstruct
    fun setupListener() {
        notificationListenerJob = CoroutineScope(Dispatchers.IO).launch {
            jdbcTemplate.dataSource!!.connection.use { connection ->
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
                    SseOutboxNotificationEvent::class.java
                )

                callbacks[event.notificationName]?.forEach { it.invoke(event.payload) }
            }
        }
    }

    @PreDestroy
    fun cleanup() {
        notificationListenerJob.cancel()
        if (!connection.isClosed) {
            connection.close()
        }
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
