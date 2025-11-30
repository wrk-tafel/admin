package at.wrk.tafel.admin.backend.database.common.sse_outbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter.SseEventBuilder
import java.util.function.Consumer

@ExtendWith(MockKExtension::class)
class SseOutboxServiceTest {

    @RelaxedMockK
    private lateinit var objectMapper: ObjectMapper

    @RelaxedMockK
    private lateinit var sseOutboxRepository: SseOutboxRepository

    @RelaxedMockK
    private lateinit var sseOutboxListenerService: SseOutboxListenerService

    @InjectMockKs
    private lateinit var service: SseOutboxService

    @RelaxedMockK
    private lateinit var sseEmitter: SseEmitter

    private val testPayload = TestJsonPayload(123)
    private val testPayloadString = "{\"value\":123}"
    private val notificationName = "test_notification"

    @BeforeEach
    fun beforeEach() {
        every { objectMapper.readValue(testPayloadString, TestJsonPayload::class.java) } returns testPayload
        every { objectMapper.writeValueAsString(testPayload) } returns testPayloadString
    }

    @Test
    fun `cleanup outbox`() {
        service.cleanupOutbox()

        verify { sseOutboxRepository.deleteAllByEventTimeBefore(any()) }
    }

    @Test
    fun saveOutboxEntry() {
        val testPayload = TestJsonPayload(123)
        val dummyPayload = "dummy-payload"
        every { objectMapper.writeValueAsString(any()) } returns dummyPayload

        val resultOutboxEntity = mockk<SseOutboxEntity>()
        every { sseOutboxRepository.save(any()) } returns resultOutboxEntity

        val returnedEntity = service.saveOutboxEntry("dummy-notification", testPayload)
        assertThat(returnedEntity).isEqualTo(resultOutboxEntity)

        verify { objectMapper.writeValueAsString(testPayload) }

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
            resultType = TestJsonPayload::class.java
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
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
            acceptFilter = acceptFilter
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
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
            resultType = TestJsonPayload::class.java
        ) { value ->
            eventReceived = value
        }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
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
            resultType = null
        ) { value ->
            eventReceived = value
        }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
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
        every { objectMapper.writeValueAsString(any()) } returns testPayloadString

        service.sendEvent(sseEmitter, testPayload)

        verify { sseEmitter.send(any<SseEventBuilder>()) }
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
            resultType = TestJsonPayload::class.java
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
            )
        }

        // Trigger timeout
        onTimeoutSlot.captured.run()

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured
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
            resultType = null
        ) { }
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
            )
        }

        // Trigger completion
        onCompletionSlot.captured.run()

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured
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
            resultType = TestJsonPayload::class.java
        )
        delay(1000)

        val callbackSlot = slot<(String?) -> Unit>()
        verify {
            sseOutboxListenerService.registerCallback(
                notificationName = notificationName,
                eventCallback = capture(callbackSlot)
            )
        }

        // Trigger error
        onErrorSlot.captured.accept(TafelException("test error"))

        verify {
            sseOutboxListenerService.unregisterCallback(
                notificationName = notificationName,
                eventCallback = callbackSlot.captured
            )
        }
    }

}

@ExcludeFromTestCoverage
data class TestJsonPayload(
    @JsonProperty("value") val value: Int,
)
