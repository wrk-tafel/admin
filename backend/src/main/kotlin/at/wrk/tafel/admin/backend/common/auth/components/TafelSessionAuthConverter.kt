package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationConverter
import java.time.Instant

/**
 * Reads who the request's login session belongs to. `request.getSession(false)` is what loads the
 * session from `spring_session` (Spring Session's `SessionRepositoryFilter` wraps the request), and
 * only this, the login and the few calls that change a session ask for it - which keeps a request for
 * a static file from ever touching the table.
 *
 * A request without a session, or with one that no longer exists or has expired, is rejected outright:
 * there is no anonymous access under `/api` beyond the public endpoints, which never get here.
 */
class TafelSessionAuthConverter : AuthenticationConverter {

    override fun convert(request: HttpServletRequest): Authentication? {
        val session = request.getSession(false)
            ?: throw AuthenticationCredentialsNotFoundException("Missing authentication credentials")

        val username = session.getAttribute(TafelSessionAttributes.USERNAME) as? String
        val sessionKey = session.getAttribute(TafelSessionAttributes.SESSION_KEY) as? String
        if (username.isNullOrBlank() || sessionKey.isNullOrBlank()) {
            throw AuthenticationCredentialsNotFoundException("Session carries no login")
        }

        return TafelAuthentication(
            sessionKey = sessionKey,
            username = username,
            mfaVerified = session.getAttribute(TafelSessionAttributes.MFA_VERIFIED) == "true",
            sessionCreatedAt = Instant.ofEpochMilli(session.creationTime),
        )
    }
}
