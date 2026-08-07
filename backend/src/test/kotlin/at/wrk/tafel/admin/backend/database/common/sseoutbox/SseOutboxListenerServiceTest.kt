package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService.Companion.NOTIFICATIONS_POLL_TIMEOUT
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService.Companion.PG_NOTIFICATION_CHANNEL_NAME
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.postgresql.PGConnection
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import java.sql.Statement

@ExtendWith(MockKExtension::class)
class SseOutboxListenerServiceTest {

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @RelaxedMockK
    private lateinit var mockStatement: Statement

    private val jdbcUrl = "jdbc:postgresql://localhost:5432/test"
    private val jdbcUsername = "test"
    private val jdbcPassword = "test"

    private lateinit var service: SseOutboxListenerService

    private val testNotificationEventString =
        "{\"notificationName\": \"test_notification\", \"payload\": {\"value\":123}}"
    private val testNotificationEvent = SseOutboxNotificationEvent(
        notificationName = "test_notification",
        payload = "{\"value\":123}",
    )
    private val notificationName = "test_notification"

    @BeforeEach
    fun beforeEach() {
        val dataSourceProperties = DataSourceProperties().apply {
            url = jdbcUrl
            username = jdbcUsername
            password = jdbcPassword
        }
        service = SseOutboxListenerService(
            dataSourceProperties = dataSourceProperties,
            jsonMapper = jsonMapper,
        )

        mockkStatic(DriverManager::class)
        val mockConnection: Connection = mockk()
        every { DriverManager.getConnection(jdbcUrl, jdbcUsername, jdbcPassword) } returns mockConnection

        every { mockConnection.createStatement() } returns mockStatement
        every { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") } returns true
        every { mockStatement.close() } returns Unit

        val mockPGConnection: PGConnection = mockk()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } returns arrayOf(
            mockk {
                every { parameter } returns testNotificationEventString
            },
        ) andThenThrows SQLException("No more notifications")
        every { mockConnection.unwrap(PGConnection::class.java) } returns mockPGConnection

        every {
            jsonMapper.readValue(
                testNotificationEventString,
                SseOutboxNotificationEvent::class.java,
            )
        } returns testNotificationEvent
    }

    @AfterEach
    fun afterEach() {
        unmockkStatic(DriverManager::class)
    }

    @Test
    fun `setup listener and processed callback`(): Unit = runBlocking {
        var retrievedPayload: String? = null
        val eventCallback: (String?) -> Unit = {
            retrievedPayload = it
        }

        service.registerCallback(notificationName = notificationName, eventCallback = eventCallback)
        service.setupListener()
        service.notificationListenerJob.join()

        verify { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") }
        assertThat(retrievedPayload).isEqualTo(testNotificationEvent.payload)
    }

    @Test
    fun `cleanup cancels the notification listener job`() {
        val notificationListenerJob = mockk<Job>()
        every { notificationListenerJob.cancel(null) } returns Unit

        service.notificationListenerJob = notificationListenerJob

        service.cleanup()

        verify { notificationListenerJob.cancel() }
    }

    @Test
    fun `register callback`() {
        val eventCallback: (String?) -> Unit = {}
        service.registerCallback(notificationName = notificationName, eventCallback = eventCallback)

        assertThat(service.callbacks).hasSize(1)
        assertThat(service.callbacks[notificationName]!!.first()).isEqualTo(eventCallback)
    }

    @Test
    fun `unregister callback`() {
        val eventCallback: (String?) -> Unit = {}
        service.registerCallback(notificationName = notificationName, eventCallback = eventCallback)

        assertThat(service.callbacks).hasSize(1)
        assertThat(service.callbacks[notificationName]).hasSize(1)

        service.unregisterCallback(notificationName = notificationName, eventCallback = eventCallback)

        assertThat(service.callbacks[notificationName]).isEmpty()
    }

    @Test
    fun `unregister callback with multiple callbacks registered`() {
        val eventCallback1: (String?) -> Unit = {}
        val eventCallback2: (String?) -> Unit = {}

        service.registerCallback(notificationName = notificationName, eventCallback = eventCallback1)
        service.registerCallback(notificationName = notificationName, eventCallback = eventCallback2)

        assertThat(service.callbacks[notificationName]).hasSize(2)

        service.unregisterCallback(notificationName = notificationName, eventCallback = eventCallback1)

        assertThat(service.callbacks[notificationName]).hasSize(1)
        assertThat(service.callbacks[notificationName]!!.first()).isEqualTo(eventCallback2)
    }
}
