package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes
import org.springframework.web.context.request.async.AsyncRequestNotUsableException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.time.Duration
import java.time.LocalDateTime
import java.util.concurrent.CopyOnWriteArrayList
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

    /**
     * Every stream currently held open through [finalize], so [sendHeartbeats] has something to
     * iterate without the outbox listener's per-notification-name callback registry (which doesn't
     * keep the [SseEmitter] itself, only the closures a notification fans out to).
     */
    private val openEmitters = CopyOnWriteArrayList<SseEmitter>()

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupOutbox() {
        val date = LocalDateTime.now().minus(tafelAdminProperties.sse.outboxRetention)
        sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(date)
    }

    /**
     * Without this, a stream nobody is publishing an event to (the ticket screen when no ticket is
     * being called, a dashboard nobody changes) can sit open for hours with nothing ever written to
     * it - so a client that silently disappeared (a closed tab, a laptop put to sleep, a dropped
     * network) is only ever noticed once the container itself eventually reclaims the connection on
     * its own, without ever dispatching back into this application, which is why [finalize]'s
     * `onError` - and with it [logStreamError] - never fires for most of these terminations
     * (issue #3746). A periodic write gives every open stream a regular chance to fail on something
     * this application actually observes, routing that same disappearance through the normal
     * `onError`/[logStreamError] path instead. A comment line, not a data event, so `EventSource` on
     * the other end never surfaces it as a message.
     *
     * The interval is a literal, not a [TafelAdminSseProperties] field, for the same reason
     * [cleanupOutbox]'s own check cadence is: `@Scheduled` fixes its schedule when this bean is
     * built, and 25 seconds is comfortably under common reverse-proxy idle-connection timeouts
     * (nginx's `proxy_read_timeout` defaults to 60s) without needing to be operator-tunable.
     */
    @Scheduled(fixedRate = 25, timeUnit = TimeUnit.SECONDS)
    fun sendHeartbeats() {
        openEmitters.forEach { trySend(it, SseEmitter.event().comment("heartbeat")) }
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
     * The latest event stored for [notificationName], for streams whose newest event *is* the
     * current state (e.g. what the ticket monitor shows) - a fresh subscriber gets it replayed as
     * its initial state instead of the publisher re-deriving that state. [after] bounds the lookup
     * to events still relevant to the caller (rows live for the whole `outboxRetention`, which is
     * far longer than any state here stays meaningful); `null` means no bound.
     */
    fun <T> findLatestEvent(notificationName: String, resultType: Class<T>, after: LocalDateTime?): T? {
        val entity = if (after != null) {
            sseOutboxRepository.findFirstByNotificationNameAndEventTimeAfterOrderByIdDesc(notificationName, after)
        } else {
            sseOutboxRepository.findFirstByNotificationNameOrderByIdDesc(notificationName)
        }
        return entity?.payload?.let { jsonMapper.readValue(it, resultType) }
    }

    /**
     * @param replayable see [SseOutboxListenerService.registerCallback] - whether this stream's
     * subscribers can take a duplicate or a late delivery of an event after a reconnect.
     * @param eventName the SSE `event:` name the forwarded payloads carry, see [sendEvent].
     */
    fun <T> forwardNotificationEventsToSse(
        sseEmitter: SseEmitter,
        notificationName: String,
        resultType: Class<T>,
        acceptFilter: (data: T?) -> Boolean = { true },
        replayable: Boolean = true,
        eventName: String? = null,
    ) {
        val callback: (String?) -> Unit = { payload ->
            val value = if (payload != null) jsonMapper.readValue(payload, resultType) else null
            if (acceptFilter(value)) {
                sendEvent(sseEmitter, payload, eventName)
            }
        }

        registerCallback(notificationName, callback, replayable)
        finalize(sseEmitter, notificationName, callback)
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

        registerCallback(notificationName, callback)
        finalize(sseEmitter, notificationName, callback)
    }

    /**
     * Registers synchronously, on the calling thread, rather than in a launched coroutine: the
     * registration itself is a plain in-memory map/list write with nothing to wait on, and a
     * launched coroutine bought nothing here but a race - `SseEmitter.onCompletion`'s cleanup
     * (`unregisterCallback`) could run and complete *before* the still-pending coroutine actually
     * executed `registerCallback`, since a non-suspending coroutine body isn't a cancellation point:
     * once it started running there was nothing left to cancel it out from under. A client
     * disconnecting in exactly that window left a callback registered forever, its closure still
     * holding the now-dead `SseEmitter`. Registering here, before this method returns, means the
     * `onCompletion`/`onTimeout`/`onError` handlers set up in [finalize] right after can never fire
     * ahead of it.
     */
    private fun registerCallback(notificationName: String, callback: (String?) -> Unit, replayable: Boolean = true) {
        try {
            sseOutboxListenerService.registerCallback(notificationName, callback, replayable)
            logger.debug("Registered SSE callback for notification: {}", notificationName)
        } catch (e: Exception) {
            logger.error("Failed to listen for notification name: $notificationName", e)
        }
    }

    private fun finalize(
        sseEmitter: SseEmitter,
        notificationName: String,
        callback: (String?) -> Unit,
    ) {
        openEmitters.add(sseEmitter)

        val cleanup = {
            openEmitters.remove(sseEmitter)
            sseOutboxListenerService.unregisterCallback(notificationName, callback)
            logger.debug("Unregistered SSE callback for notification: {}", notificationName)
        }

        sseEmitter.onTimeout {
            cleanup()
            // Without this, an idle timeout leaves the async request neither completed nor errored,
            // so Spring MVC eventually raises AsyncRequestTimeoutException on it and answers with a
            // 503 logged at WARN (see GenericExceptionHandler.handleExceptionInternal) - for what is
            // a routine idle SSE stream ending, not a failure. Completing it here instead ends the
            // response normally; the client's EventSource reconnects either way.
            sseEmitter.complete()
        }
        sseEmitter.onCompletion {
            cleanup()
        }
        val stream = describeCurrentRequest()
        val openedAt = System.nanoTime()
        sseEmitter.onError { error ->
            cleanup()
            logStreamError(stream, Duration.ofNanos(System.nanoTime() - openedAt), error)
        }
    }

    /**
     * The one place a container-level failure of an open stream surfaces before Spring turns it into
     * a response: the emitter's error callback gets the `Throwable` first, and the exception handlers
     * that follow deliberately log a dropped connection at debug only (see
     * `GenericExceptionHandler.handleAsyncRequestNotUsableException`). Left unlogged here, a burst of
     * failed streams leaves nothing in `app.log` to say what failed - issue #3704.
     *
     * A broken connection ([IOException]: the client or the proxy went away) stays a one-line INFO
     * without a stack trace - it is routine, but its class, message and how long the stream had been
     * open are what tells a network blip from a proxy timeout. Anything else is unexpected and
     * gets the full stack trace at WARN.
     */
    private fun logStreamError(stream: String, openFor: Duration, error: Throwable) {
        if (error is IOException) {
            logger.info(
                "SSE stream {} ended by a broken connection after {}s: {}: {}",
                stream,
                openFor.seconds,
                error::class.simpleName,
                sanitizeForLog(error.message),
            )
        } else {
            logger.warn("SSE stream $stream failed after ${openFor.seconds}s", error)
        }
    }

    private fun describeCurrentRequest(): String {
        val request = (RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes)?.request
            ?: return "(unknown request)"
        return sanitizeForLog("${request.method} ${request.requestURI}")
    }

    /**
     * @param eventName sent as the SSE `event:` field. A stream that carries more than one kind of
     * message names all but its main one, so the browser can route them to different listeners
     * (`EventSource.addEventListener`) instead of parsing everything as the main payload.
     */
    fun sendEvent(sseEmitter: SseEmitter, data: Any?, eventName: String? = null) {
        var event = SseEmitter.event()
        if (eventName != null) {
            event = event.name(eventName)
        }
        if (data != null) {
            event = event.data(data)
        }
        trySend(sseEmitter, event)
    }

    private fun trySend(sseEmitter: SseEmitter, event: SseEmitter.SseEventBuilder) {
        try {
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
