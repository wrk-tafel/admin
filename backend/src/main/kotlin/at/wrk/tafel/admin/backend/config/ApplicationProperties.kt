package at.wrk.tafel.admin.backend.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding

@ConfigurationProperties
@ConstructorBinding
data class ApplicationProperties(
    val security: SecurityProperties
)

data class SecurityProperties(
    val jwtToken: SecurityJwtTokenProperties
)

data class SecurityJwtTokenProperties(
    val issuer: String,
    val audience: String,
    val secret: SecurityJwtTokenSecretProperties,
    val expirationTimeInSeconds: Int
)

data class SecurityJwtTokenSecretProperties(
    val value: String,
    val algorithm: String
)
