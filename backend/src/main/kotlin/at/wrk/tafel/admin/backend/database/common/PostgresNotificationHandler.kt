package at.wrk.tafel.admin.backend.database.common

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.postgresql.PGConnection
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

@Component
class PostgresNotificationHandler(
    private val objectMapper: ObjectMapper,
    private val jdbcTemplate: JdbcTemplate,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(PostgresNotificationHandler::class.java)
    }

    fun <T> startListening(
        notificationChannel: String,
        resultType: Class<T>,
        notifyCallback: (payload: T) -> Unit,
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val connection = jdbcTemplate.dataSource!!.connection
                val pgConn = connection.unwrap(PGConnection::class.java)
                val stmt = connection.createStatement()
                stmt.execute("LISTEN $notificationChannel;")
                stmt.close()

                while (true) {
                    val notifications = pgConn.getNotifications(5000)
                    if (notifications != null) {
                        for (notification in notifications) {
                            val parsedObject = objectMapper.readValue(notification.parameter, resultType)
                            notifyCallback(parsedObject)
                        }
                    }
                }
            } catch (e: Exception) {
                logger.error("Failed to listen for notification channel: $notificationChannel", e)
            }
        }
    }

}
