package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import io.jsonwebtoken.JwtException
import org.springframework.security.authentication.AuthenticationProvider
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.*

class TafelJwtAuthProvider(
    private val jwtTokenService: JwtTokenService,
    private val userRepository: UserRepository,
) : AuthenticationProvider {

    override fun supports(authentication: Class<*>): Boolean = authentication == TafelJwtAuthentication::class.java

    /**
     * A validly-signed, unexpired JWT proves identity only - it carries no permissions claim. The
     * referenced user's authorities (and `enabled`/`passwordChangeRequired` state) are read fresh
     * from the DB on every authenticated request instead, so a permission change an administrator
     * makes takes effect on the user's very next request rather than only after their token expires
     * and they log in again.
     *
     * The same per-request reload is what lets a stolen or shared token be cut off on demand: if
     * [UserEntity.tokenInvalidatedAt] is set and this token's `issuedAt` is not strictly after it,
     * the token is rejected here even though it is otherwise validly signed and unexpired - see
     * [UserEntity.tokenInvalidatedAt] for who bumps it and why.
     */
    override fun authenticate(authentication: Authentication): TafelJwtAuthentication {
        try {
            val tafelJwtAuthentication = authentication as TafelJwtAuthentication

            val claims = jwtTokenService.getClaimsFromToken(tafelJwtAuthentication.tokenValue)
            val expired = claims.expiration.before(Date())
            if (expired) {
                throw CredentialsExpiredException("Token not valid")
            }

            val userEntity = claims.subject?.let { userRepository.findByUsername(it) }
            if (userEntity?.enabled != true) {
                throw DisabledException("User '${claims.subject}' is disabled or doesn't exist")
            }

            val tokenInvalidatedAt = userEntity.tokenInvalidatedAt
            if (tokenInvalidatedAt != null) {
                val issuedAt = claims.issuedAt?.let { LocalDateTime.ofInstant(it.toInstant(), ZoneId.systemDefault()) }
                // The JWT `iat` claim is serialized at whole-second precision (RFC 7519 NumericDate),
                // while tokenInvalidatedAt carries sub-second precision - comparing against it
                // untruncated would spuriously reject a token reissued in the very same second as the
                // invalidating event (e.g. UserController.changePassword minting a replacement token
                // right after invalidating the request's own). Truncating to seconds before comparing
                // keeps a same-second reissue valid without weakening the actual protection: a token
                // genuinely issued before the invalidating event is still rejected either way.
                if (issuedAt == null || issuedAt.isBefore(tokenInvalidatedAt.truncatedTo(ChronoUnit.SECONDS))) {
                    throw CredentialsExpiredException("Token not valid")
                }
            }

            return TafelJwtAuthentication(tafelJwtAuthentication.tokenValue, claims.subject, true, effectivePermissions(userEntity), userEntity.id)
        } catch (e: JwtException) {
            throw BadCredentialsException(e.message, e)
        }
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
    private fun effectivePermissions(userEntity: UserEntity): List<GrantedAuthority> {
        if (userEntity.passwordChangeRequired) {
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
