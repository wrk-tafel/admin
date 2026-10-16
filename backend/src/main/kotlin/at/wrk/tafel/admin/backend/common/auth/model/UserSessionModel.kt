package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class UserSessionListResponse(
    val items: List<UserSessionItem>,
)

/** One login of the caller's, as "Mein Konto" > "Sitzungen" lists it. */
@ExcludeFromTestCoverage
data class UserSessionItem(
    // The session's key (see `TafelSessionAttributes.SESSION_KEY`) - never the session id the cookie carries.
    val id: String,
    // The browser's User-Agent at login (shortened), which the frontend turns into "Firefox unter Windows" - the
    // caller's own, so nothing they did not send themselves. Null for a session opened without one.
    val userAgent: String?,
    val signedInAt: LocalDateTime,
    val lastUsedAt: LocalDateTime,
    // The session this very request came in on - it is ended by logging out, not from the list.
    val current: Boolean,
)

/**
 * Published on the SSE outbox when sessions were ended, so every application instance completes the
 * event streams those sessions still hold open (see `SseEventsController`) - otherwise an ended
 * session would keep receiving events until its browser reconnected.
 */
@ExcludeFromTestCoverage
data class SessionsEndedEvent(
    val sessionKeys: List<String> = emptyList(),
)
