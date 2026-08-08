package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService.Companion.CONNECTION_APPLICATION_NAME
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService.Companion.NOTIFICATIONS_POLL_TIMEOUT
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService.Companion.PG_NOTIFICATION_CHANNEL_NAME
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.Job
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.postgresql.PGConnection
import org.postgresql.PGNotification
import org.postgresql.PGProperty
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties
import tools.jackson.databind.json.JsonMapper
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import java.sql.Statement
import java.time.Duration
import java.time.LocalDateTime
import java.util.Properties
import java.util.concurrent.CopyOnWriteArrayList

@ExtendWith(MockKExtension::class)
class SseOutboxListenerServiceTest {

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @RelaxedMockK
    private lateinit var sseOutboxRepository: SseOutboxRepository

    @RelaxedMockK
    private lateinit var mockStatement: Statement

    private val jdbcUrl = "jdbc:postgresql://localhost:5432/test"
    private val jdbcUsername = "test"
    private val jdbcPassword = "test"

    private lateinit var service: SseOutboxListenerService
    private lateinit var mockConnection: Connection
    private lateinit var mockPGConnection: PGConnection
    private val connectionProperties = slot<Properties>()

    private var runningService: SseOutboxListenerService? = null

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
            sseOutboxRepository = sseOutboxRepository,
        )

        mockkStatic(DriverManager::class)
        mockConnection = mockk()
        every { DriverManager.getConnection(jdbcUrl, capture(connectionProperties)) } returns mockConnection

        every { mockConnection.createStatement() } returns mockStatement
        every { mockConnection.isValid(any()) } returns true
        every { mockConnection.close() } returns Unit
        every { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") } returns true
        every { mockStatement.close() } returns Unit

        mockPGConnection = mockk()
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
        runningService?.cleanup()
        unmockkStatic(DriverManager::class)
    }

    @Test
    fun `setup listener and processed callback`() {
        val receivedPayloads = CopyOnWriteArrayList<String?>()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } returns
            arrayOf(notification(testNotificationEventString)) andThenAnswer { idlePoll() }

        service.registerCallback(notificationName = notificationName, eventCallback = { receivedPayloads.add(it) })
        startListener()

        awaitUntil { assertThat(receivedPayloads).containsExactly(testNotificationEvent.payload) }
        verify { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") }

        assertThat(connectionProperties.captured.getProperty("user")).isEqualTo(jdbcUsername)
        assertThat(connectionProperties.captured.getProperty("password")).isEqualTo(jdbcPassword)
        assertThat(connectionProperties.captured.getProperty(PGProperty.APPLICATION_NAME.getName()))
            .isEqualTo(CONNECTION_APPLICATION_NAME)
    }

    @Test
    fun `reconnects and replays missed outbox entries after the connection died`() {
        val receivedPayloads = CopyOnWriteArrayList<String?>()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } throws
            SQLException("connection died") andThen
            arrayOf(notification(testNotificationEventString)) andThenAnswer { idlePoll() }

        val replayedFrom = slot<LocalDateTime>()
        every { sseOutboxRepository.findAllByEventTimeAfterOrderByEventTimeAsc(capture(replayedFrom)) } returns
            listOf(outboxEntity(notificationName, "{\"value\":\"missed\"}"))

        service.registerCallback(notificationName = notificationName, eventCallback = { receivedPayloads.add(it) })
        startListener()

        awaitUntil {
            // The replayed backlog first, then the live notification received on the new connection.
            assertThat(receivedPayloads).containsExactly("{\"value\":\"missed\"}", testNotificationEvent.payload)
        }
        verify(exactly = 2) { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") }
        assertThat(replayedFrom.captured).isBefore(LocalDateTime.now())
    }

    @Test
    fun `skips events of notifications registered as non-replayable`() {
        val receivedPayloads = CopyOnWriteArrayList<String?>()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } throws
            SQLException("connection died") andThenAnswer { idlePoll() }

        every { sseOutboxRepository.findAllByEventTimeAfterOrderByEventTimeAsc(any()) } returns listOf(
            outboxEntity(notificationName, "{\"value\":\"missed\"}"),
            outboxEntity(OTHER_NOTIFICATION_NAME, "{\"value\":\"replayed\"}"),
        )

        service.registerCallback(
            notificationName = notificationName,
            eventCallback = { receivedPayloads.add(it) },
            replayable = false,
        )
        service.registerCallback(
            notificationName = OTHER_NOTIFICATION_NAME,
            eventCallback = { receivedPayloads.add(it) },
        )
        startListener()

        awaitUntil { assertThat(receivedPayloads).containsExactly("{\"value\":\"replayed\"}") }
    }

    @Test
    fun `reconnects when an idle connection turns out to be invalid`() {
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } returns emptyArray() andThenAnswer {
            idlePoll()
        }
        every { mockConnection.isValid(any()) } returns false andThen true

        startListener()

        awaitUntil { verify(exactly = 2) { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") } }
    }

    @Test
    fun `keeps listening when a notification cannot be processed`() {
        val receivedPayloads = CopyOnWriteArrayList<String?>()
        every { mockPGConnection.getNotifications(NOTIFICATIONS_POLL_TIMEOUT) } returns
            arrayOf(notification("not-json"), notification(testNotificationEventString)) andThenAnswer { idlePoll() }
        every { jsonMapper.readValue("not-json", SseOutboxNotificationEvent::class.java) } throws
            IllegalArgumentException("unparsable payload")

        service.registerCallback(notificationName = notificationName, eventCallback = { receivedPayloads.add(it) })
        startListener()

        awaitUntil { assertThat(receivedPayloads).containsExactly(testNotificationEvent.payload) }
        // Still the same connection - an unreadable payload isn't a reason to drop it and reconnect.
        verify(exactly = 1) { mockStatement.execute("LISTEN $PG_NOTIFICATION_CHANNEL_NAME;") }
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

    private fun startListener() {
        runningService = service
        service.setupListener()
    }

    private fun awaitUntil(assertion: () -> Unit) = await().atMost(Duration.ofSeconds(10)).untilAsserted(assertion)

    private fun notification(payload: String): PGNotification = mockk {
        every { parameter } returns payload
    }

    private fun outboxEntity(notificationName: String, payload: String) = SseOutboxEntity().apply {
        this.eventTime = LocalDateTime.now()
        this.notificationName = notificationName
        this.payload = payload
    }

    /**
     * Stands in for the blocking wait a real connection does - without it the mocked poll returns
     * instantly and the listener loop would spin at full speed for the rest of the test.
     */
    private fun idlePoll(): Array<PGNotification> {
        Thread.sleep(IDLE_POLL_SLEEP_MILLIS)
        return emptyArray()
    }

    companion object {
        private const val IDLE_POLL_SLEEP_MILLIS = 50L
        private const val OTHER_NOTIFICATION_NAME = "other_test_notification"
    }
}
