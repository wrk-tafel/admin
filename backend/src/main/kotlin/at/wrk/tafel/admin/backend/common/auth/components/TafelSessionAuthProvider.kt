package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.springframework.security.authentication.AuthenticationProvider
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.time.Clock
import java.time.Duration

class TafelSessionAuthProvider(
    private val userRepository: UserRepository,
    private val properties: TafelAdminProperties,
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
) : AuthenticationProvider {

    override fun supports(authentication: Class<*>): Boolean = authentication == TafelAuthentication::class.java

    /**
     * A session proves identity only - it carries no permissions. The referenced user's authorities (and
     * `enabled`/`passwordChangeRequired` state) are read fresh from the DB on every authenticated request
     * instead, so a permission change an administrator makes takes effect on the user's very next request.
     *
     * The session's lifetime is counted from the login (`security.session`): a finished session lasts
     * `lifetimeInSeconds`, one that still owes a password change or its second factor only
     * `pendingLifetimeInSeconds`. Spring Session itself only knows an inactivity timeout, which a session in
     * daily use would never reach.
     */
    override fun authenticate(authentication: Authentication): TafelAuthentication {
        val sessionAuthentication = authentication as TafelAuthentication

        val userEntity = sessionAuthentication.username?.let { userRepository.findByUsername(it) }
        if (userEntity?.enabled != true) {
            throw DisabledException("User '${sessionAuthentication.username}' is disabled or doesn't exist")
        }

        // Whether the user *has* two-factor authentication is read from the DB just above, so switching it on
        // takes effect on every session that has not passed it.
        val mfaVerified = sessionAuthentication.mfaVerified
        val mfaPending = userEntity.hasMfa && !mfaVerified
        // The operator can require every user to have a second factor - one who has none can then do
        // nothing but set one up - and, independently, an e-mail address on the account: a user whose
        // only method is the app still owes one, since ADR-0062 makes the address itself mandatory, not
        // just a prerequisite for the e-mail method. Read per request from the (hot-reloaded)
        // configuration, so switching the requirement on reaches sessions that were open already.
        val mfaSetupRequired = properties.mfa.required && (!userEntity.hasMfa || userEntity.email.isNullOrBlank())

        val pending = userEntity.passwordChangeRequired || mfaPending
        if (isExpired(sessionAuthentication, pending)) {
            throw CredentialsExpiredException("Session expired")
        }

        return TafelAuthentication(
            sessionKey = sessionAuthentication.sessionKey,
            username = userEntity.username,
            authenticated = true,
            authorities = effectivePermissions(userEntity, mfaPending || mfaSetupRequired),
            userId = userEntity.id,
            mfaVerified = mfaVerified,
            mfaPending = mfaPending,
            mfaSetupRequired = mfaSetupRequired,
            mfaMethods = listOfNotNull("TOTP".takeIf { userEntity.mfaTotpEnabled }, "EMAIL".takeIf { userEntity.mfaEmailEnabled }),
            sessionCreatedAt = sessionAuthentication.sessionCreatedAt,
        )
    }

    private fun isExpired(authentication: TafelAuthentication, pending: Boolean): Boolean {
        val createdAt = authentication.sessionCreatedAt ?: return true
        val sessionProperties = applicationProperties.security.session
        val lifetime = if (pending) sessionProperties.pendingLifetimeInSeconds else sessionProperties.lifetimeInSeconds
        return !clock.instant().isBefore(createdAt.plus(Duration.ofSeconds(lifetime)))
    }

    /**
     * A pending forced password change deliberately grants no permissions at all - the user must
     * clear that before any real access. Otherwise [UserPermissions.ADMINISTRATOR] is expanded into
     * every permission, since it grants everything; doing that here - the one place a request's
     * authorities are computed - is what makes it hold for every consumer at once: `@PreAuthorize`
     * on the backend reads these authorities, `/api/users/info` echoes them, and the frontend's
     * route guards and `tafelIfPermission` directive go by that same list.
     *
     * Deliberately *not* done when a user is loaded for the user-management screens: what is stored
     * against the account stays the single `ADMINISTRATOR` entry, so the permission editor keeps
     * showing what was actually assigned instead of every box ticked - and saving such a user cannot
     * silently write the expanded set back.
     */
    private fun effectivePermissions(userEntity: UserEntity, secondFactorOutstanding: Boolean): List<GrantedAuthority> {
        // Same for a login that is still waiting for its second factor (or has to set one up): the password
        // alone opens nothing.
        if (userEntity.passwordChangeRequired || secondFactorOutstanding) {
            return emptyList()
        }

        val granted = userEntity.authorities.map { it.name }
        val expanded = if (granted.contains(UserPermissions.ADMINISTRATOR.key)) {
            UserPermissions.entries.map { it.key }
        } else {
            granted
        }
        return expanded.map { SimpleGrantedAuthority(it) }
    }
}
