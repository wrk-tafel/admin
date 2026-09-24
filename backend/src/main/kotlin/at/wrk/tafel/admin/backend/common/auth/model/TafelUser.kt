package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.core.CredentialsContainer
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

@ExcludeFromTestCoverage
data class TafelUser(
    private val username: String,
    private var password: String?,
    val enabled: Boolean,
    val id: Long?,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
    private val authorities: Collection<GrantedAuthority>,
    val passwordChangeRequired: Boolean,
    val email: String? = null,
    val mfaTotpEnabled: Boolean = false,
    val mfaEmailEnabled: Boolean = false,
) : UserDetails,
    CredentialsContainer {
    /** Whether a login needs a second factor - either method is enough. */
    val mfaEnabled: Boolean
        get() = mfaTotpEnabled || mfaEmailEnabled

    /** The methods that complete a login, as the API names them. */
    val mfaMethods: List<String>
        get() = listOfNotNull("TOTP".takeIf { mfaTotpEnabled }, "EMAIL".takeIf { mfaEmailEnabled })

    override fun getAuthorities(): Collection<GrantedAuthority> = authorities
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
