package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.SessionsEndedEvent
import at.wrk.tafel.admin.backend.common.auth.model.UserSessionItem
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpSession
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.session.FindByIndexNameSessionRepository
import org.springframework.session.Session
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime

/**
 * Everything that opens, changes or ends a login session (`spring_session`, ADR-0070).
 *
 * A session is opened by the login ([startSession]) and from then on only ever changes in two ways: it
 * passes the second factor ([completeSecondFactor]) or its user's password changes
 * ([completePasswordChange]). Ending one deletes its row - whatever instance the next request lands on
 * finds no session and answers `401` - and publishes a [SessionsEndedEvent], which completes the event
 * stream the session may still hold open on any instance.
 */
@Service
class UserSessionService(
    private val sessionRepository: FindByIndexNameSessionRepository<out Session>,
    private val sseOutboxService: SseOutboxService,
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(UserSessionService::class.java)
        const val SESSIONS_ENDED_NOTIFICATION = "sessions-ended"
    }

    /**
     * Opens the session a successful login hands out. A session the request already carried is ended
     * first, so a session id somebody else planted in this browser before the login never becomes a
     * logged-in one.
     */
    fun startSession(request: HttpServletRequest, username: String, pending: Boolean): HttpSession {
        request.getSession(false)?.invalidate()
        val session = request.getSession(true)
        session.setAttribute(TafelSessionAttributes.USERNAME, username)
        session.setAttribute(TafelSessionAttributes.SESSION_KEY, TafelSessionAttributes.newSessionKey())
        request.getHeader(HttpHeaders.USER_AGENT)?.takeIf { it.isNotBlank() }?.let {
            session.setAttribute(TafelSessionAttributes.USER_AGENT, it.take(TafelSessionAttributes.USER_AGENT_MAX_LENGTH))
        }
        session.maxInactiveInterval = lifetime(pending).toSeconds().toInt()
        return session
    }

    /**
     * Marks the session as having passed the second factor. The session id changes with it: the id the
     * browser had while the code was owed was issued for a password alone, and is worth nothing from now on.
     */
    fun completeSecondFactor(request: HttpServletRequest, passwordChangeRequired: Boolean) {
        val session = request.getSession(false) ?: return
        session.setAttribute(TafelSessionAttributes.MFA_VERIFIED, "true")
        session.maxInactiveInterval = lifetime(passwordChangeRequired).toSeconds().toInt()
        request.changeSessionId()
    }

    /** A password change finishes a login that was waiting for it - from now on the session lasts as long as any. */
    fun completePasswordChange(request: HttpServletRequest) {
        val session = request.getSession(false) ?: return
        session.maxInactiveInterval = lifetime(pending = false).toSeconds().toInt()
    }

    fun listSessions(username: String, currentSessionKey: String?): List<UserSessionItem> = activeSessions(username)
        .mapNotNull { session ->
            val key = session.getAttribute<String>(TafelSessionAttributes.SESSION_KEY) ?: return@mapNotNull null
            UserSessionItem(
                id = key,
                userAgent = session.getAttribute<String>(TafelSessionAttributes.USER_AGENT),
                signedInAt = LocalDateTime.ofInstant(session.creationTime, clock.zone),
                lastUsedAt = LocalDateTime.ofInstant(session.lastAccessedTime, clock.zone),
                current = key == currentSessionKey,
            )
        }
        .sortedWith(compareByDescending<UserSessionItem> { it.current }.thenByDescending { it.lastUsedAt })

    /** Ends one of [username]'s sessions; `false` when there is none with that key (anymore). */
    fun endSession(username: String, sessionKey: String): Boolean = endSessions(username) { it == sessionKey } > 0

    /** Ends every session of [username] but the one known by [keptSessionKey] - "on all other devices". */
    fun endOtherSessions(username: String, keptSessionKey: String?): Int = endSessions(username) { it != keptSessionKey }

    /** Ends every session of [username] - for an account that was disabled, renamed, deleted or given a new password. */
    fun endAllSessions(username: String): Int = endSessions(username) { true }

    /** Logout: ends the session the request came in on, and tells the browser to drop its cookie. */
    fun endCurrentSession(request: HttpServletRequest) {
        val session = request.getSession(false) ?: return
        val key = session.getAttribute(TafelSessionAttributes.SESSION_KEY) as? String
        session.invalidate()
        key?.let { publishEnded(listOf(it)) }
    }

    private fun endSessions(username: String, keyMatches: (String) -> Boolean): Int {
        val ended = sessionRepository.findByPrincipalName(username)
            .mapNotNull { (id, session) ->
                val key = session.getAttribute<String>(TafelSessionAttributes.SESSION_KEY)
                if (key != null && keyMatches(key)) id to key else null
            }
        ended.forEach { (id, _) -> sessionRepository.deleteById(id) }
        if (ended.isNotEmpty()) {
            logger.info("Ended {} session(s) of user '{}'", ended.size, sanitizeForLog(username))
            publishEnded(ended.map { it.second })
        }
        return ended.size
    }

    private fun activeSessions(username: String): List<Session> {
        val now = clock.instant()
        val lifetime = lifetime(pending = false)
        return sessionRepository.findByPrincipalName(username).values
            .filter { !it.isExpired && now.isBefore(it.creationTime.plus(lifetime)) }
    }

    private fun publishEnded(sessionKeys: List<String>) {
        sseOutboxService.saveOutboxEntry(SESSIONS_ENDED_NOTIFICATION, SessionsEndedEvent(sessionKeys))
    }

    private fun lifetime(pending: Boolean): Duration {
        val sessionProperties = applicationProperties.security.session
        return Duration.ofSeconds(if (pending) sessionProperties.pendingLifetimeInSeconds else sessionProperties.lifetimeInSeconds)
    }
}
