package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.request.async.AsyncRequestNotUsableException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * Publishing side of the SSE outbox pattern: persists an event as a row in `sse_outbox` and lets
 * emitters subscribe to named notifications for real-time push to the frontend.
 *
 * Writing the row (not calling `pg_notify` directly) is what makes this an outbox: the insert
 * commits atomically with the business transaction that produced the event, and a Postgres
 * trigger (see migration `R__00057_added_notification_procedure.sql`) fires `pg_notify('sse_outbox', ...)`
 * only after that commit. [SseOutboxListenerService] is the other half - it holds the single
 * `LISTEN` connection and fans notifications back out to the callbacks registered here.
 */
@Service
class SseOutboxService(
    private val jsonMapper: JsonMapper,
    private val sseOutboxRepository: SseOutboxRepository,
    private val sseOutboxListenerService: SseOutboxListenerService,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(SseOutboxService::class.java)
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupOutbox() {
        val date = LocalDateTime.now().minus(tafelAdminProperties.sse.outboxRetention)
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

    /**
     * @param replayable see [SseOutboxListenerService.registerCallback] - whether this stream's
     * subscribers can take a duplicate or a late delivery of an event after a reconnect.
     */
    fun <T> forwardNotificationEventsToSse(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>,
        acceptFilter: (data: T?) -> Boolean = { true },
        replayable: Boolean = true,
    ) {
        val callback: (String?) -> Unit = { payload ->
            val value = if (payload != null) jsonMapper.readValue(payload, resultType) else null
            if (acceptFilter(value)) {
                sendEvent(sseEmitter, payload)
            }
        }

        val job = CoroutineScope(Dispatchers.IO).launch {
            try {
                sseOutboxListenerService.registerCallback(notificationName, callback, replayable)
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
        } catch (e: AsyncRequestNotUsableException) {
            // Client disconnected during async processing — expected when clients
            // navigate away or close their connection. This is a normal scenario,
            // not an error. Don't log it as ERROR, just clean up silently.
            logger.debug("SSE client disconnected during async processing")
            // Try to complete the emitter to release resources
            try {
                sseEmitter.complete()
            } catch (ex: Exception) {
                // Already completed, ignore
            }
        } catch (e: IOException) {
            // Broken pipe / client disconnected — expected when clients navigate away
            // or close their connection. Don't try to complete the emitter; it's
            // either already completed by cleanup callbacks or in an error state.
            logger.debug("SSE client disconnected: {}", e.message)
        } catch (e: IllegalStateException) {
            // Emitter already completed — cleanup may not have finished yet
            logger.debug("Attempted to send to already completed SSE emitter")
        }
    }
}
