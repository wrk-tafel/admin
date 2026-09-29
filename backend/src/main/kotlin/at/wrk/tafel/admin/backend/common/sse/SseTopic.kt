package at.wrk.tafel.admin.backend.common.sse

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * One kind of event a session can listen for on its single stream (`GET /api/sse/events`, see
 * [SseEventsController]). The module that owns the data implements it as a bean; the stream just
 * collects them, so `common` never depends on the modules feeding it.
 *
 * A topic sends everything it has under its own [name] as the SSE `event:` field, which is what the
 * browser routes on - see `SseOutboxService.sendEvent`.
 */
interface SseTopic {

    /** What a client asks for in `topics=` and what its events are named. Unique across all topics. */
    val name: String

    /**
     * Authorities of which the caller needs at least one, empty for every authenticated user. What
     * used to be the `@PreAuthorize` of the topic's own endpoint - administrators hold every
     * authority, their token is expanded on login.
     */
    val requiredAuthorities: Set<String>
        get() = emptySet()

    /**
     * Sends the topic's initial state, if it has one, and registers what forwards later events to
     * [emitter]. [argument] is the part after the colon in `name:argument`, null without one.
     */
    fun subscribe(emitter: SseEmitter, argument: String?)
}
