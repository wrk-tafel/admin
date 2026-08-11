package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import com.fasterxml.jackson.annotation.JsonProperty
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.within
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.context.request.async.AsyncRequestNotUsableException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter.SseEventBuilder
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.time.Duration
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import java.util.function.Consumer

@ExtendWith(MockKExtension::class)
class SseOutboxServiceTest {

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @RelaxedMockK
    private lateinit var sseOutboxRepository: SseOutboxRepository

    @RelaxedMockK
    private lateinit var sseOutboxListenerService: SseOutboxListenerService

    @RelaxedMockK
    private lateinit var sseEmitter: SseEmitter

    private lateinit var service: SseOutboxService

    private val tafelAdminProperties = TafelAdminProperties()

    private val testPayload = TestJsonPayload(123)
    private val testPayloadString = "{\"value\":123}"
    private val notificationName = "test_notification"

    @BeforeEach
    fun beforeEach() {
        service = SseOutboxService(jsonMapper, sseOutboxRepository, sseOutboxListenerService, tafelAdminProperties)

        every { jsonMapper.readValue(testPayloadString, TestJsonPayload::class.java) } returns testPayload
        every { jsonMapper.writeValueAsString(testPayload) } returns testPayloadString
    }

    @Test
    fun `cleanup outbox`() {
        service.cleanupOutbox()

        verify { sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(any()) }
    }

    /**
     * The retention is configuration, not a constant - a deployment whose outbox is growing faster
     * than it is read has to be able to shorten it without a restart.
     */
    @Test
    fun `cleanup deletes everything older than the configured retention`() {
        tafelAdminProperties.sse.outboxRetention = Duration.ofDays(3)

        service.cleanupOutbox()

        val cutoffSlot = slot<LocalDateTime>()
        verify { sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(capture(cutoffSlot)) }
        assertThat(cutoffSlot.captured).isCloseTo(LocalDateTime.now().minusDays(3), within(1, ChronoUnit.MINUTES))
    }

    @Test
    fun saveOutboxEntry() {
        val testPayload = TestJsonPayload(123)
        val dummyPayload = "dummy-payload"
        every { jsonMapper.writeValueAsString(any()) } returns dummyPayload

        val resultOutboxEntity = mockk<SseOutboxEntity>()
        every { sseOutboxRepository.save(any()) } returns resultOutboxEntity

        val returnedEntity = service.saveOutboxEntry("dummy-notification", testPayload)
        assertThat(returnedEntity).isEqualTo(resultOutboxEntity)

        verify { jsonMapper.writeValueAsString(testPayload) }

        val savedOutboxEntitySlot = slot<SseOutboxEntity>()
        verify { sseOutboxRepository.save(capture(savedOutboxEntitySlot)) }

        val savedOutboxEntity = savedOutboxEntitySlot.captured
        assertThat(savedOutboxEntity.eventTime).isNotNull()
        assertThat(savedOutboxEntity.notificationName).isEqualTo("dummy-notification")
        assertThat(savedOutboxEntity.payload).isEqualTo(dummyPayload)
    }

    @Test
    fun `forward notification events to sse`() = runBlocking {
        service.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }
        val callback = callbackSlot.captured
        callback(testPayloadString)

        verify(exactly = 1) { sseEmitter.send(any<SseEventBuilder>()) }
    }

    @Test
    fun `forward notification events to sse while result is filtered and nothing gets forwarded`() = runBlocking {
        val acceptFilter: (Any?) -> Boolean = { false }

        service.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
            acceptFilter = acceptFilter,
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }
        val callback = callbackSlot.captured
        callback(testPayloadString)

        verify(exactly = 0) { sseEmitter.send(any<SseEventBuilder>()) }
    }

    @Test
    fun `listen for notification events`(): Unit = runBlocking {
        var eventReceived: TestJsonPayload? = null
        service.listenForNotificationEvents(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
        ) { value ->
            eventReceived = value
        }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }
        val callback = callbackSlot.captured
        callback(testPayloadString)

        assertThat(eventReceived).isEqualTo(testPayload)
    }

    @Test
    fun `listen for notification events without return type`(): Unit = runBlocking {
        var eventReceived: Unit? = null
        service.listenForNotificationEvents<Unit>(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = null,
        ) { value ->
            eventReceived = value
        }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }
        val callback = callbackSlot.captured
        callback(testPayloadString)

        assertThat(eventReceived).isEqualTo(null)
    }

    @Test
    fun `send event`() {
        val sseEmitter = mockk<SseEmitter>()
        every { sseEmitter.send(any<SseEventBuilder>()) } returns Unit

        val testPayload = TestJsonPayload(123)
        val testPayloadString = "{\"value\":123}"
        every { jsonMapper.writeValueAsString(any()) } returns testPayloadString

        service.sendEvent(sseEmitter, testPayload)

        verify { sseEmitter.send(any<SseEventBuilder>()) }
    }

    @Test
    fun `forward notification events logs error when registering callback fails`() = runBlocking {
        every {
            sseOutboxListenerService.registerCallback(notificationName = notificationName, eventCallback = any())
        } throws IllegalStateException("registration failed")

        service.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
        )
        delay(1000)

        verify {
            sseOutboxListenerService.registerCallback(notificationName = notificationName, eventCallback = any())
        }
    }

    @Test
    fun `listen for notification events logs error when registering callback fails`() = runBlocking {
        every {
            sseOutboxListenerService.registerCallback(notificationName = notificationName, eventCallback = any())
        } throws IllegalStateException("registration failed")

        service.listenForNotificationEvents<Unit>(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = null,
        ) { }
        delay(1000)

        verify {
            sseOutboxListenerService.registerCallback(notificationName = notificationName, eventCallback = any())
        }
    }

    @Test
    fun `send event completes emitter when AsyncRequestNotUsableException occurs`() {
        val sseEmitter = mockk<SseEmitter>()
        every { sseEmitter.send(any<SseEventBuilder>()) } throws AsyncRequestNotUsableException("disconnected")
        every { sseEmitter.complete() } returns Unit

        assertThatCode { service.sendEvent(sseEmitter, testPayload) }.doesNotThrowAnyException()

        verify { sseEmitter.complete() }
    }

    @Test
    fun `send event ignores exception when completing an already completed emitter`() {
        val sseEmitter = mockk<SseEmitter>()
        every { sseEmitter.send(any<SseEventBuilder>()) } throws AsyncRequestNotUsableException("disconnected")
        every { sseEmitter.complete() } throws IllegalStateException("already completed")

        assertThatCode { service.sendEvent(sseEmitter, testPayload) }.doesNotThrowAnyException()
    }

    @Test
    fun `send event handles IOException`() {
        val sseEmitter = mockk<SseEmitter>()
        every { sseEmitter.send(any<SseEventBuilder>()) } throws IOException("broken pipe")

        assertThatCode { service.sendEvent(sseEmitter, testPayload) }.doesNotThrowAnyException()
    }

    @Test
    fun `send event handles IllegalStateException`() {
        val sseEmitter = mockk<SseEmitter>()
        every { sseEmitter.send(any<SseEventBuilder>()) } throws IllegalStateException("already completed")

        assertThatCode { service.sendEvent(sseEmitter, testPayload) }.doesNotThrowAnyException()
    }

    @Test
    fun `callback is unregistered on emitter timeout`() = runBlocking {
        val onTimeoutSlot = slot<Runnable>()
        every { sseEmitter.onTimeout(capture(onTimeoutSlot)) } returns Unit
        every { sseEmitter.onCompletion(any()) } returns Unit
        every { sseEmitter.onError(any<Consumer<Throwable>>()) } returns Unit

        service.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }

        // Trigger timeout
        onTimeoutSlot.captured.run()

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured,
            )
        }
    }

    @Test
    fun `callback is unregistered on emitter completion`() = runBlocking {
        val onCompletionSlot = slot<Runnable>()
        every { sseEmitter.onTimeout(any()) } returns Unit
        every { sseEmitter.onCompletion(capture(onCompletionSlot)) } returns Unit
        every { sseEmitter.onError(any<Consumer<Throwable>>()) } returns Unit

        service.listenForNotificationEvents<Unit>(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = null,
        ) { }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }

        // Trigger completion
        onCompletionSlot.captured.run()

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured,
            )
        }
    }

    @Test
    fun `callback is unregistered on emitter error`() = runBlocking {
        val onErrorSlot = slot<Consumer<Throwable>>()
        every { sseEmitter.onTimeout(any()) } returns Unit
        every { sseEmitter.onCompletion(any()) } returns Unit
        every { sseEmitter.onError(capture(onErrorSlot)) } returns Unit

        service.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = notificationName,
            resultType = TestJsonPayload::class.java,
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot),
            )
        }

        // Trigger error
        onErrorSlot.captured.accept(IllegalStateException("test error"))

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured,
            )
        }
    }
}

@ExcludeFromTestCoverage
data class TestJsonPayload(
    @param:JsonProperty("value") val value: Int,
)
