package at.wrk.tafel.admin.backend.common.sse

import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * The one stream a browser tab holds open: `GET /api/sse/events?topics=distribution,config`. Which
 * topics are on it is the client's choice, per what the open screen needs - the URL is the whole
 * subscription, so nothing is remembered server-side and any application instance can serve any
 * stream. A client that wants a different set opens a new stream with it (see `sse.service.ts`).
 *
 * Authorization is per topic ([SseTopic.requiredAuthorities]); asking for a topic the caller may not
 * have is a 403 for the whole stream rather than a silently thinner one.
 */
@RestController
@RequestMapping("/api/sse/events")
@PreAuthorize("isAuthenticated()")
class SseEventsController(
    topics: List<SseTopic>,
    private val sseEmitterFactory: SseEmitterFactory,
) {
    private val topicsByName: Map<String, SseTopic> = topics.associateBy { it.name }.also {
        check(it.size == topics.size) { "Two SSE topics share a name: ${topics.map { topic -> topic.name }}" }
    }

    @GetMapping
    fun listen(@RequestParam topics: List<String>): SseEmitter {
        val requested = topics.distinct().map { entry ->
            val name = entry.substringBefore(':')
            val argument = if (entry.contains(':')) entry.substringAfter(':') else null
            val topic = topicsByName[name] ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Unbekanntes Thema: $name")
            topic to argument
        }
        if (requested.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Kein Thema angegeben")
        }

        val authorities = SecurityContextHolder.getContext().authentication!!.authorities.map { it.authority }.toSet()
        requested.forEach { (topic, _) ->
            if (topic.requiredAuthorities.isNotEmpty() && topic.requiredAuthorities.none { it in authorities }) {
                throw AccessDeniedException("Thema ${topic.name} nicht erlaubt")
            }
        }

        val sseEmitter = sseEmitterFactory.createSseEmitter()
        requested.forEach { (topic, argument) -> topic.subscribe(sseEmitter, argument) }
        return sseEmitter
    }
}
