package at.wrk.tafel.admin.backend.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties
data class ApplicationProperties(
    val security: SecurityProperties
)

data class SecurityProperties(
    val jwtToken: SecurityJwtTokenProperties,
    val loginAttempts: SecurityLoginAttemptsProperties = SecurityLoginAttemptsProperties()
)

data class SecurityLoginAttemptsProperties(
    val maxFailures: Int = 5,
    val lockoutDurationInSeconds: Long = 900
)

data class SecurityJwtTokenProperties(
    val issuer: String,
    val audience: String,
    val secret: SecurityJwtTokenSecretProperties,
    val expirationTimeInSeconds: Int,
    val expirationTimePwdChangeInSeconds: Int
)

data class SecurityJwtTokenSecretProperties(
    val value: String,
    val algorithm: String
)
