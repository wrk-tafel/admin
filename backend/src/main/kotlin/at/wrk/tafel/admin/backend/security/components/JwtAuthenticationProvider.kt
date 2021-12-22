package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationToken
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Component
import java.util.*

@Component
class JwtAuthenticationProvider(
    private val jwtTokenService: JwtTokenService,
    private val userDetailsService: UserDetailsService
) : AbstractUserDetailsAuthenticationProvider() {

    override fun supports(authenticationClass: Class<*>): Boolean {
        return authenticationClass.isAssignableFrom(JwtAuthenticationToken::class.java)
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
    override fun retrieveUser(username: String, authentication: UsernamePasswordAuthenticationToken): UserDetails? {
        val jwtAuthenticationToken = authentication as JwtAuthenticationToken

        val claims = jwtTokenService.getClaimsFromToken(jwtAuthenticationToken.tokenString)
        val valid = claims.expiration.before(Date())
        if (!valid) {
            throw CredentialsExpiredException("Token not valid")
        }

        val tokenUsername = claims.subject
        val userDetails: UserDetails = userDetailsService.loadUserByUsername(tokenUsername)
        if (tokenUsername != username) {
            throw UsernameNotFoundException("Username doesn't match") // TODO necessary?
        }

        return userDetails
    }

}
