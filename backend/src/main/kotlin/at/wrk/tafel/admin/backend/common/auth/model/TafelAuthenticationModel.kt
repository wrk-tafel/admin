package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import java.time.Instant

/**
 * Who a request comes from, rebuilt on every request from the login session it carries (see
 * `TafelSessionAuthConverter`/`TafelSessionAuthProvider`). Never stored itself: the session holds
 * strings only, so a session written by one version of the application reads the same in the next.
 */
@ExcludeFromTestCoverage
class TafelAuthentication(
    // The key the session is known by outside the cookie - what `GET /api/users/sessions` lists and what
    // ending a session names. Random, set at login and kept for the life of the session (also across
    // the session id change after the second factor), never the cookie value itself.
    val sessionKey: String? = null,
    val username: String? = null,
    private var authenticated: Boolean = false,
    private val authorities: List<GrantedAuthority> = emptyList(),
    // Carried alongside `username` so `AuditActorProvider.currentUserId()` (JPA auditing's
    // `@CreatedBy`/`@LastModifiedBy`, see `JpaAuditingConfig`) never has to query for it itself -
    // that query would run from inside Hibernate's persist cascade for the entity being audited,
    // which can trigger an auto-flush of an only half-built object graph (issue #3426's fix, see
    // `TafelSessionAuthProvider`, which already loads the full `UserEntity` for this request anyway).
    val userId: Long? = null,
    // Whether the session passed the second factor, and whether the user still owes one - the latter is
    // what keeps a password-only session from setting up, changing or removing it.
    val mfaVerified: Boolean = false,
    val mfaPending: Boolean = false,
    // The deployment requires a second factor and this user has none: the session can only set one up.
    val mfaSetupRequired: Boolean = false,
    // The methods the user can complete a login with ("TOTP", "EMAIL") - what the code page offers.
    val mfaMethods: List<String> = emptyList(),
    // When the session was opened - what its lifetime is counted from (see `TafelSessionAuthProvider`).
    val sessionCreatedAt: Instant? = null,
) : Authentication {
    override fun getName(): String? = username

    override fun getAuthorities(): Collection<GrantedAuthority> = authorities

    override fun getCredentials(): Any? = null

    override fun getDetails(): Any? = null

    override fun getPrincipal(): Any? = null

    override fun isAuthenticated(): Boolean = authenticated

    override fun setAuthenticated(isAuthenticated: Boolean) {
        authenticated = isAuthenticated
    }

    fun hasRole(role: String): Boolean = authorities.map { it.authority }.contains(role)
}

@ExcludeFromTestCoverage
data class LoginResponse(
    val passwordChangeRequired: Boolean? = false,
    // The password was right but a code from the authenticator app is still needed - the session is
    // not usable until POST /api/mfa/verify accepted it.
    val mfaRequired: Boolean? = false,
    // Which methods complete it ("TOTP", "EMAIL"), so the code page can offer to send the e-mailed code.
    val mfaMethods: List<String> = emptyList(),
)
