package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService.Companion.CLAIM_KEY_FULLNAME
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.jsonwebtoken.JwtException
import org.springframework.security.authentication.AuthenticationProvider
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.core.Authentication
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.util.*

class TafelJwtAuthProvider(
    private val jwtTokenService: JwtTokenService,
) : AuthenticationProvider {

    override fun supports(authenticationClass: Class<*>?): Boolean {
        return authenticationClass == TafelJwtAuthentication::class.java
    }

    override fun authenticate(authentication: Authentication): TafelJwtAuthentication {
        try {
            val tafelJwtAuthentication = authentication as TafelJwtAuthentication

            val claims = jwtTokenService.getClaimsFromToken(tafelJwtAuthentication.tokenValue)
            val expired = claims.expiration.before(Date())
            if (expired) {
                throw CredentialsExpiredException("Token not valid")
            }

            val permissionClaims = claims[JwtTokenService.CLAIM_KEY_PERMISSIONS]
            val mappedPermissions =
                if (permissionClaims is List<*>) permissionClaims.map { SimpleGrantedAuthority(it as String) }
                else emptyList()
            val fullName = claims[CLAIM_KEY_FULLNAME] as String?

            return TafelJwtAuthentication(
                tokenValue = tafelJwtAuthentication.tokenValue,
                fullName = fullName,
                username = claims.subject,
                authenticated = true,
                authorities = mappedPermissions
            )
        } catch (e: JwtException) {
            throw BadCredentialsException(e.message, e)
        }
    }

}
