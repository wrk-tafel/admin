package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRepository
import org.springframework.security.web.csrf.DefaultCsrfToken
import org.springframework.web.util.WebUtils
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * A [CookieCsrfTokenRepository] whose generated token is a pure function of the session's JWT
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
 * Deriving the value from the JWT instead makes the burst converge: every response of a given
 * session writes the identical token, so the cookie stops moving and there is nothing left to race
 * with. The derivation is an HMAC keyed with a sub-key of the JWT secret (see [derivedSecret]), so
 * the value stays unguessable for anyone who cannot read the (http-only) JWT cookie - which is what
 * a CSRF token has to be - and leaks nothing about the JWT itself. A request with no JWT (the login
 * page) still gets a random token; the only mutating endpoint reachable there is `/api/login`,
 * which is CSRF-exempt.
 */
class SessionBoundCsrfTokenRepository(
    private val delegate: CookieCsrfTokenRepository,
    secret: String,
) : CsrfTokenRepository by delegate {

    companion object {
        private const val HMAC_ALGORITHM = "HmacSHA256"

        // Fixed label an HMAC of the JWT secret is keyed with to derive a CSRF-only sub-key -
        // key separation so a compromise of the CSRF token cookie (which is not http-only, unlike
        // the JWT cookie) can never be turned into the JWT signing key, and vice versa.
        private const val KEY_DERIVATION_LABEL = "tafel-admin-csrf-token-v1"
    }

    // Derived once per repository instance rather than per request - the label is fixed, so the
    // result never changes for a given JWT secret.
    private val derivedSecret: ByteArray = hmac(secret.toByteArray(), KEY_DERIVATION_LABEL.toByteArray())

    override fun generateToken(request: HttpServletRequest): CsrfToken {
        val generatedToken = delegate.generateToken(request)
        val jwt = WebUtils.getCookie(request, TafelLoginFilter.jwtCookieName)?.value
        if (jwt.isNullOrBlank()) {
            return generatedToken
        }
        return DefaultCsrfToken(generatedToken.headerName, generatedToken.parameterName, deriveTokenValue(jwt))
    }

    private fun deriveTokenValue(jwt: String): String = Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(derivedSecret, jwt.toByteArray()))

    private fun hmac(
        key: ByteArray,
        data: ByteArray,
    ): ByteArray {
        val mac = Mac.getInstance(HMAC_ALGORITHM)
        mac.init(SecretKeySpec(key, HMAC_ALGORITHM))
        return mac.doFinal(data)
    }
}
