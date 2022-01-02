package at.wrk.tafel.admin.backend.security.model

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken

data class JwtAuthenticationToken(
    val tokenValue: String
) : UsernamePasswordAuthenticationToken(null, null)

data class JwtResponse(
    val token: String
)
