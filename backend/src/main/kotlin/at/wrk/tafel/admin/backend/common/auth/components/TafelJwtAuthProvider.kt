package at.wrk.tafel.admin.backend.common.auth.components

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

    override fun supports(authentication: Class<*>): Boolean {
        return authentication == TafelJwtAuthentication::class.java
    }

    override fun authenticate(authentication: Authentication): TafelJwtAuthentication {
        try {
            val tafelJwtAuthentication = authentication as TafelJwtAuthentication

            val claims = jwtTokenService.getClaimsFromToken(tafelJwtAuthentication.tokenValue)
            val expired = claims.expiration.before(Date())
            if (expired) {
                throw CredentialsExpiredException("Token not valid")
            }

            val permissionClaims = claims[JwtTokenService.PERMISSIONS_CLAIM_KEY]

            val mappedPermissions =
                if (permissionClaims is List<*>) permissionClaims.map { SimpleGrantedAuthority(it as String) } else emptyList()
            return TafelJwtAuthentication(tafelJwtAuthentication.tokenValue, claims.subject, true, mappedPermissions)
        } catch (e: JwtException) {
            throw BadCredentialsException(e.message, e)
        }
    }

}
