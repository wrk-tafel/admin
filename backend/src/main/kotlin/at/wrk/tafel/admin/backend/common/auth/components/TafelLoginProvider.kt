package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.LockedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider
import org.springframework.security.core.Authentication
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.UUID

class TafelLoginProvider(
    private val userDetailsService: UserDetailsService,
    private val passwordEncoder: PasswordEncoder,
    private val loginAttemptService: LoginAttemptService,
) : AbstractUserDetailsAuthenticationProvider() {

    // A login for an unknown username would fail without running Argon2 and therefore respond
    // measurably faster than a wrong password, allowing username enumeration via timing.
    // Comparing against this throwaway hash equalizes both paths.
    private val unknownUserFallbackHash: String = passwordEncoder.encode(UUID.randomUUID().toString())!!

    override fun supports(authenticationClass: Class<*>): Boolean = authenticationClass == UsernamePasswordAuthenticationToken::class.java

    override fun authenticate(authentication: Authentication): Authentication {
        val username = authentication.name ?: ""
        if (loginAttemptService.isLocked(username)) {
            throw LockedException("User '$username' is locked due to too many failed login attempts")
        }

        try {
            val result = super.authenticate(authentication)
            loginAttemptService.recordSuccess(username)
            return result
        } catch (e: BadCredentialsException) {
            loginAttemptService.recordFailure(username)
            throw e
        }
    }

    override fun retrieveUser(username: String, authentication: UsernamePasswordAuthenticationToken): UserDetails {
        try {
            return userDetailsService.loadUserByUsername(username)
        } catch (e: UsernameNotFoundException) {
            passwordEncoder.matches(authentication.credentials as? String ?: "", unknownUserFallbackHash)
            throw e
        }
    }

    override fun additionalAuthenticationChecks(
        userDetails: UserDetails,
        authentication: UsernamePasswordAuthenticationToken,
    ) {
        if (!passwordEncoder.matches(authentication.credentials as String, userDetails.password)) {
            throw BadCredentialsException("Password wrong for user '${authentication.name}'")
        }
    }
}
