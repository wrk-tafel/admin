package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority

@ExcludeFromTestCoverage
class TafelJwtAuthentication(
    val tokenValue: String,
    val username: String? = null,
    val fullName: String? = null,
    private var authenticated: Boolean = false,
    private val authorities: List<GrantedAuthority> = emptyList(),
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
data class LoginResponse(
    val passwordChangeRequired: Boolean? = false,
)
