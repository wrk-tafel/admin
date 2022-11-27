package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken

@ExcludeFromTestCoverage
data class JwtAuthenticationToken(
    val tokenValue: String
) : UsernamePasswordAuthenticationToken(null, null)

@ExcludeFromTestCoverage
data class JwtAuthenticationResponse(
    val token: String?,
    val passwordChangeRequired: Boolean? = false
)
