package at.wrk.tafel.admin.backend.database.common.sse_outbox

import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxListenerService.Companion.NOTIFICATIONS_POLL_TIMEOUT
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxListenerService.Companion.PG_NOTIFICATION_CHANNEL_NAME
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.postgresql.PGConnection
import org.springframework.jdbc.core.JdbcTemplate
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.sql.SQLException
import java.sql.Statement

@ExtendWith(MockKExtension::class)
class SseOutboxListenerServiceTest {

    @RelaxedMockK
    private lateinit var jdbcTemplate: JdbcTemplate

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @RelaxedMockK
    private lateinit var mockStatement: Statement

    @InjectMockKs
    private lateinit var service: SseOutboxListenerService

    private val testNotificationEventString =
        "{\"notificationName\": \"test_notification\", \"payload\": {\"value\":123}}"
    private val testNotificationEvent = SseOutboxNotificationEvent(
        notificationName = "test_notification",
        payload = "{\"value\":123}"
    )
    private val notificationName = "test_notification"

    @BeforeEach
    fun beforeEach() {
        val mockConnection: Connection = mockk()
        every { jdbcTemplate.dataSource!!.connection } returns mockConnection

        every { mockConnection.createStatement() } returns mockStatement
        every { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") } returns true
        every { mockStatement.close() } returns Unit

        val mockPGConnection: PGConnection = mockk()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } returns arrayOf(
            mockk {
                every { parameter } returns testNotificationEventString
            }
        ) andThenThrows SQLException("No more notifications")
        every { mockConnection.unwrap(PGConnection::class.java) } returns mockPGConnection

        every {
            jsonMapper.readValue(
                testNotificationEventString,
                SseOutboxNotificationEvent::class.java
            )
        } returns testNotificationEvent
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
    fun `cleanup with open connection`() {
        val connection = mockk<Connection>()
        every { connection.isClosed } returns false
        every { connection.close() } returns Unit
        val notificationListenerJob = mockk<Job>()
        every { notificationListenerJob.cancel(null) } returns Unit

        service.connection = connection
        service.notificationListenerJob = notificationListenerJob

        service.cleanup()

        verify { notificationListenerJob.cancel() }
        verify { connection.close() }
    }

    @Test
    fun `cleanup with closed connection`() {
        val connection = mockk<Connection>()
        every { connection.isClosed } returns true
        every { connection.close() } returns Unit
        val notificationListenerJob = mockk<Job>()
        every { notificationListenerJob.cancel(null) } returns Unit

        service.connection = connection
        service.notificationListenerJob = notificationListenerJob

        service.cleanup()

        verify(exactly = 0) { connection.close() }
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
