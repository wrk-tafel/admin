package at.wrk.tafel.admin.backend.app.security.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken

@ExcludeFromTestCoverage
data class JwtAuthenticationToken(
    val tokenValue: String
) : UsernamePasswordAuthenticationToken(null, null)

@ExcludeFromTestCoverage
data class JwtResponse(
    val token: String
)
