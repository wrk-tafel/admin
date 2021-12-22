package at.wrk.tafel.admin.backend.security.model

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken

data class JwtAuthenticationToken(
    val tokenString: String
) : UsernamePasswordAuthenticationToken(null, null)

data class JwtAuthenticationRequest(
    val username: String,
    val password: String
)

data class JwtResponse(
    val token: String
)
