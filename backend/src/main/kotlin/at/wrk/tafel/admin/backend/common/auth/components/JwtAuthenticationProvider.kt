package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder

class JwtAuthenticationProvider(
    private val userDetailsService: UserDetailsService,
    private val passwordEncoder: PasswordEncoder
) : AbstractUserDetailsAuthenticationProvider() {

    override fun supports(authenticationClass: Class<*>): Boolean {
        return authenticationClass == UsernamePasswordAuthenticationToken::class.java
    }

    override fun retrieveUser(username: String, authentication: UsernamePasswordAuthenticationToken): UserDetails {
        return userDetailsService.loadUserByUsername(username)
    }

    override fun additionalAuthenticationChecks(
        userDetails: UserDetails,
        authentication: UsernamePasswordAuthenticationToken
    ) {
        if (!passwordEncoder.matches(authentication.credentials as String, userDetails.password)) {
            throw BadCredentialsException("Aktuelles Passwort ist falsch!")
        }
    }

}
