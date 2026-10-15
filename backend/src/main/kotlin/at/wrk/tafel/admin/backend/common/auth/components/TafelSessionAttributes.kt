package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.session.FindByIndexNameSessionRepository
import java.security.SecureRandom
import java.util.Base64

/**
 * What a login session (`spring_session`, ADR-0070) holds. Strings only, on purpose: Spring Session
 * stores an attribute Java-serialized, and a serialized object of one of this application's own
 * classes - a `SecurityContext`, an `Authentication` - might no longer read in the next version,
 * which would log everybody out at a deploy. A `String` reads the same in every version. The
 * `Authentication` is rebuilt from these on every request instead (`TafelSessionAuthProvider`), so
 * a permission change, a disabled account or a newly required second factor counts at once.
 */
object TafelSessionAttributes {

    /** The cookie the session id travels in (`SessionCookieConfig`). */
    const val COOKIE_NAME = "tafel-admin-session"

    /** The username. Spring Session copies it into `spring_session.principal_name`, which is how a user's sessions are found. */
    val USERNAME: String = FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME

    /**
     * The key the API knows the session by (`GET /api/users/sessions`, `DELETE /api/users/sessions/{key}`).
     * Random and unrelated to the session id, so listing the sessions never hands out what the cookie carries.
     */
    const val SESSION_KEY = "tafel.sessionKey"

    /** `"true"` once the second factor was passed, absent otherwise. */
    const val MFA_VERIFIED = "tafel.mfaVerified"

    /** The browser's `User-Agent` at login, shortened - what the session list describes the device by (`user-agent-label.util.ts`). */
    const val USER_AGENT = "tafel.userAgent"

    const val USER_AGENT_MAX_LENGTH = 512

    private val random = SecureRandom()

    fun newSessionKey(): String {
        val bytes = ByteArray(24)
        random.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }
}
