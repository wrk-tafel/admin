package at.wrk.tafel.admin.backend.security.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.core.CredentialsContainer
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

@ExcludeFromTestCoverage
data class TafelUser(
    private val username: String,
    private var password: String?,
    private val enabled: Boolean,
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
    private val authorities: Collection<out GrantedAuthority>,
    val passwordChangeRequired: Boolean
) : UserDetails, CredentialsContainer {
    override fun getAuthorities(): Collection<out GrantedAuthority> = authorities
    override fun getPassword(): String? = password
    override fun getUsername(): String = username
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = enabled
    override fun eraseCredentials() {
        this.password = null
    }
}
