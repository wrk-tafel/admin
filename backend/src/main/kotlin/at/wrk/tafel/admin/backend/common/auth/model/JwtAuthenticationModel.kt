package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority

@ExcludeFromTestCoverage
class TafelJwtAuthentication(
    val tokenValue: String,
    val username: String?,
    private var authenticated: Boolean,
    private val authorities: List<GrantedAuthority> = emptyList()
) : Authentication {
    override fun getName(): String? {
        return username
    }

    override fun getAuthorities(): Collection<GrantedAuthority> {
        return authorities
    }

    override fun getCredentials(): Any? {
        return null
    }

    override fun getDetails(): Any? {
        return null
    }

    override fun getPrincipal(): Any? {
        return null
    }

    override fun isAuthenticated(): Boolean {
        return authenticated
    }

    override fun setAuthenticated(isAuthenticated: Boolean) {
        authenticated = isAuthenticated
    }
}

@ExcludeFromTestCoverage
data class JwtAuthenticationResponse(
    val token: String?,
    val passwordChangeRequired: Boolean? = false
)
