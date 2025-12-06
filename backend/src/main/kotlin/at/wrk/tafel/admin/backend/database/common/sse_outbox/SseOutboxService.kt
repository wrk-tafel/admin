package at.wrk.tafel.admin.backend.database.common.sse_outbox

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

@Service
class SseOutboxService(
    private val jsonMapper: JsonMapper,
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

        val serializedPayload = jsonMapper.writeValueAsString(payload)
        sseOutboxEntity.payload = serializedPayload

        return sseOutboxRepository.save(sseOutboxEntity)
    }

    fun <T> forwardNotificationEventsToSse(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>,
        acceptFilter: (data: T?) -> Boolean = { true },
    ) {
        val callback: (String?) -> Unit = { payload ->
            val value = if (payload != null) jsonMapper.readValue(payload, resultType) else null
            if (acceptFilter(value)) {
                sendEvent(sseEmitter, payload)
            }
        }

        val job = CoroutineScope(Dispatchers.IO).launch {
            try {
                sseOutboxListenerService.registerCallback(notificationName, callback)
                logger.debug("Registered SSE callback for notification: {}", notificationName)
            } catch (e: Exception) {
                logger.error("Failed to listen for notification name: $notificationName", e)
            }
        }

        finalize(sseEmitter, job, notificationName, callback)
    }

    fun <T> listenForNotificationEvents(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>?,
        resultCallback: (data: T?) -> Unit,
    ) {
        val callback: (String?) -> Unit = { payload ->
            val value =
                if (payload != null && resultType != null) jsonMapper.readValue(payload, resultType) else null
            resultCallback(value)
        }

        val job = CoroutineScope(Dispatchers.IO).launch {
            try {
                sseOutboxListenerService.registerCallback(notificationName, callback)
                logger.debug("Registered SSE callback for notification: {}", notificationName)
            } catch (e: Exception) {
                logger.error("Failed to listen for notification name: $notificationName", e)
            }
        }

        finalize(sseEmitter, job, notificationName, callback)
    }

    private fun finalize(
        sseEmitter: SseEmitter,
        coroutine: Job,
        notificationName: String,
        callback: (String?) -> Unit,
    ) {
        val cleanup = {
            coroutine.cancel()
            sseOutboxListenerService.unregisterCallback(notificationName, callback)
            logger.debug("Unregistered SSE callback for notification: {}", notificationName)
        }

        sseEmitter.onTimeout {
            cleanup()
        }
        sseEmitter.onCompletion {
            cleanup()
        }
        sseEmitter.onError {
            cleanup()
        }
    }

    fun sendEvent(sseEmitter: SseEmitter, data: Any?) {
        try {
            var event = SseEmitter.event()
            if (data != null) {
                event = event.data(data)
            }
            sseEmitter.send(event)
        } catch (e: IllegalStateException) {
            // Emitter already completed - callback cleanup may not have finished yet
            logger.warn("Attempted to send to already completed SSE emitter", e)
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
