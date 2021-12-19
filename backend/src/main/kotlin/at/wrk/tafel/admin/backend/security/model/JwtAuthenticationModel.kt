package at.wrk.tafel.admin.backend.security.model

data class JwtAuthenticationRequest(
    val username: String,
    val password: String
)

data class JwtResponse(
    val accessToken: String
)
