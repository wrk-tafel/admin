package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRepository
import org.springframework.security.web.csrf.DefaultCsrfToken
import org.springframework.web.util.WebUtils
import java.security.MessageDigest
import java.util.Base64

/**
 * A [CookieCsrfTokenRepository] whose generated token is a pure function of the session cookie
 * instead of a fresh random value per call.
 *
 * A token is only ever generated for a request that arrives *without* an `XSRF-TOKEN` cookie, and
 * the generated value is immediately written back as a `Set-Cookie`. With a random value that makes
 * every such request mint a different token: while the SPA is bootstrapping it fires several
 * requests in parallel, all of them cookie-less until the first response comes back, so the cookie
 * ends up rewritten once per response and the value a client read a moment earlier is no longer
 * the one the next request carries. The mutating request in the middle of that burst is then denied
 * with an `InvalidCsrfTokenException` even though header and cookie were both present and both
 * server-issued - the sporadic 403s of issue #3101.
 *
 * Deriving the value from the session cookie instead makes the burst converge: every response of a
 * given session writes the identical token, so the cookie stops moving and there is nothing left to
 * race with. The derivation is a SHA-256 over a fixed label and the cookie's value. The cookie carries
 * a random session id nobody but its browser knows (and it is `HttpOnly`), so the token is as
 * unguessable as a CSRF token has to be, and being a one-way hash it tells whoever reads it - it is
 * readable by script, unlike the session cookie - nothing about the session id. It is computed from
 * the cookie alone, without loading the session. A request with no session cookie (the login page)
 * still gets a random token; the only mutating endpoint reachable there is `/api/login`, which is
 * CSRF-exempt.
 */
class SessionBoundCsrfTokenRepository(
    private val delegate: CookieCsrfTokenRepository,
    private val sessionCookieName: String,
) : CsrfTokenRepository by delegate {

    companion object {
        // Domain separation: the same cookie value hashed for any other purpose never yields this token.
        private const val DERIVATION_LABEL = "tafel-admin-csrf-token-v2:"
    }

    override fun generateToken(request: HttpServletRequest): CsrfToken {
        val generatedToken = delegate.generateToken(request)
        val sessionCookie = WebUtils.getCookie(request, sessionCookieName)?.value
        if (sessionCookie.isNullOrBlank()) {
            return generatedToken
        }
        return DefaultCsrfToken(generatedToken.headerName, generatedToken.parameterName, deriveTokenValue(sessionCookie))
    }

    private fun deriveTokenValue(sessionCookie: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest((DERIVATION_LABEL + sessionCookie).toByteArray())
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
    }
}
