package at.wrk.tafel.admin.backend.database.common.sse_outbox

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.IOException
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

@Service
class SseOutboxService(
    private val objectMapper: ObjectMapper,
    private val sseOutboxRepository: SseOutboxRepository,
    private val sseOutboxListenerService: SseOutboxListenerService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(SseOutboxService::class.java)
        private const val NOTIFICATIONS_CLEANUP_KEEP_DAYS = 14L
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupOutbox() {
        val date = LocalDateTime.now().minusDays(NOTIFICATIONS_CLEANUP_KEEP_DAYS)
        sseOutboxRepository.deleteAllByEventTimeBefore(date)
    }

    @Transactional
    fun saveOutboxEntry(notificationName: String, payload: Any): SseOutboxEntity {
        val sseOutboxEntity = SseOutboxEntity()
        sseOutboxEntity.eventTime = LocalDateTime.now()
        sseOutboxEntity.notificationName = notificationName

        val serializedPayload = objectMapper.writeValueAsString(payload)
        sseOutboxEntity.payload = serializedPayload

        return sseOutboxRepository.save(sseOutboxEntity)
    }

    fun <T> forwardNotificationEventsToSse(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>,
        acceptFilter: (data: T?) -> Boolean = { true },
    ) {
        val job = CoroutineScope(Dispatchers.IO).launch {
            try {
                sseOutboxListenerService.registerCallback(notificationName) { payload ->
                    val value = if (payload != null) objectMapper.readValue(payload, resultType) else null
                    if (acceptFilter(value)) {
                        sendEvent(sseEmitter, payload)
                    }
                }
            } catch (e: Exception) {
                logger.error("Failed to listen for notification name: $notificationName", e)
            }
        }

        finalize(sseEmitter, job)
    }

    fun <T> listenForNotificationEvents(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>?,
        resultCallback: (data: T?) -> Unit,
    ) {
        val job = CoroutineScope(Dispatchers.IO).launch {
            try {
                sseOutboxListenerService.registerCallback(notificationName) { payload ->
                    val value =
                        if (payload != null && resultType != null) objectMapper.readValue(payload, resultType) else null
                    resultCallback(value)
                }
            } catch (e: Exception) {
                logger.error("Failed to listen for notification name: $notificationName", e)
            }
        }

        finalize(sseEmitter, job)
    }

    private fun finalize(
        sseEmitter: SseEmitter,
        coroutine: Job,
    ) {
        sseEmitter.onTimeout {
            coroutine.cancel()
        }
        sseEmitter.onCompletion {
            coroutine.cancel()
        }
        sseEmitter.onError {
            coroutine.cancel()
        }
    }

    fun sendEvent(sseEmitter: SseEmitter, data: Any?) {
        try {
            var event = SseEmitter.event()
            if (data != null) {
                event = event.data(data)
            }
            sseEmitter.send(event)
        } catch (e: IOException) {
            // Broken pipe, client disconnected
            logger.warn("SSE client disconnected", e)
            sseEmitter.complete()
        } catch (e: Exception) {
            logger.warn("Unexpected error during SSE send", e)
            sseEmitter.completeWithError(e)
        }
    }

}
