package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationToken
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.InsufficientAuthenticationException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import java.util.*

class JwtAuthenticationProvider(
    private val jwtTokenService: JwtTokenService,
    private val userDetailsService: UserDetailsService
) : AbstractUserDetailsAuthenticationProvider() {

    private val logger = LoggerFactory.getLogger(JwtAuthenticationProvider::class.java)

    override fun supports(authenticationClass: Class<*>): Boolean {
        return authenticationClass == JwtAuthenticationToken::class.java
    }

    override fun additionalAuthenticationChecks(
        userDetails: UserDetails,
        authentication: UsernamePasswordAuthenticationToken
    ) {
    }

    /**
     * This method fetches the user information from the database.
     * As the token provides stateless authentication we could also save the query and use the informations from the token.
     * Still the database query is more realtime when deactivating users, etc...
     */
    override fun retrieveUser(username: String, authentication: UsernamePasswordAuthenticationToken): UserDetails {
        try {
            val jwtAuthenticationToken = authentication as JwtAuthenticationToken

            val claims = jwtTokenService.getClaimsFromToken(jwtAuthenticationToken.tokenValue)
            val expired = claims.expiration.before(Date())
            if (expired) {
                throw CredentialsExpiredException("Token not valid")
            }

            val tokenUsername = claims.subject
            return userDetailsService.loadUserByUsername(tokenUsername)
        } catch (e: Exception) {
            logger.error(e.message, e)
            throw InsufficientAuthenticationException(e.message, e)
        }
    }

}
