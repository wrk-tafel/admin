package at.wrk.tafel.admin.backend.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Unlike [TafelAdminProperties], these stay fixed for the lifetime of the process: they are
 * constructor-bound, which Spring Cloud's rebinder can only replace and never update, so a config
 * reload ([ConfigFileReloadService]) leaves them exactly as they were bound at startup.
 *
 * That is deliberate. Rotating a JWT secret or moving the issuer/audience under a running
 * application would invalidate every session in flight at a moment nobody chose, and requiring
 * these as constructor parameters is what makes the application refuse to start at all when one of
 * them is missing - a guarantee that would be traded for a silent default the moment they became
 * mutable JavaBeans.
 *
 * The practical catch: `LoginAttemptService` and `TafelLoginFilter` read these per call, which
 * looks live but isn't. Changing a lockout policy or a token lifetime needs a restart.
 */
@ConfigurationProperties
data class ApplicationProperties(
    val security: SecurityProperties,
)

data class SecurityProperties(
    val jwtToken: SecurityJwtTokenProperties,
    val loginAttempts: SecurityLoginAttemptsProperties = SecurityLoginAttemptsProperties(),
)

data class SecurityLoginAttemptsProperties(
    val maxFailures: Int = 5,
    val lockoutDurationInSeconds: Long = 900,
)

data class SecurityJwtTokenProperties(
    val issuer: String,
    val audience: String,
    val secret: SecurityJwtTokenSecretProperties,
    val expirationTimeInSeconds: Int,
    val expirationTimePwdChangeInSeconds: Int,
)

data class SecurityJwtTokenSecretProperties(
    val value: String,
    val algorithm: String,
)
