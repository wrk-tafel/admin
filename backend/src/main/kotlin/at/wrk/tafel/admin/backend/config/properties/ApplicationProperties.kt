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
    val loginAttemptsIp: SecurityLoginAttemptsIpProperties = SecurityLoginAttemptsIpProperties(),
    val argon2: SecurityArgon2Properties = SecurityArgon2Properties(),
    val rateLimit: SecurityRateLimitProperties = SecurityRateLimitProperties(),
)

data class SecurityLoginAttemptsProperties(
    val maxFailures: Int = 5,
    val lockoutDurationInSeconds: Long = 900,
)

/**
 * The IP-scoped counterpart to [SecurityLoginAttemptsProperties] ([LoginAttemptIpService]): failed
 * logins from one IP, across however many different usernames, lock that IP out the same way a
 * single username locks out on its own. `maxFailures` sits well above the per-username threshold -
 * several genuine staff members sharing one NAT'd office IP can each mistype their own password a
 * few times without tripping this, but a distributed guesser working through many usernames from
 * that same IP still runs out of budget.
 */
data class SecurityLoginAttemptsIpProperties(
    val maxFailures: Int = 30,
    val lockoutDurationInSeconds: Long = 900,
)

/**
 * Token-bucket limits [RateLimitFilter] enforces per client IP, independently for `/api/login` and
 * `/api/support` (each gets its own bucket per IP, so hammering one never eats the other's budget).
 * `capacity` is both the bucket size and the burst a single IP may spend at once; it then refills by
 * `refillTokens` every `refillPeriodInSeconds`. Unlike [SecurityLoginAttemptsProperties], which tracks
 * failures per *username* in the database and therefore applies cluster-wide, this counts *every*
 * request (successful or not) per *IP* and lives only in the process's own memory
 * ([RateLimiterIpService]) - deliberately so, since blunting credential stuffing needs no cross-instance
 * coordination, so a small in-process servlet filter is enough.
 */
data class SecurityRateLimitProperties(
    val enabled: Boolean = true,
    val capacity: Int = 30,
    val refillTokens: Int = 30,
    val refillPeriodInSeconds: Long = 60,
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

/**
 * Tuning for the Argon2id hash `WebSecurityConfig.passwordEncoder` verifies and creates every
 * password with (Spring Security's `Argon2PasswordEncoder` always uses the Argon2id variant, so
 * there is no separate "which Argon2 variant" setting here). Constructor-bound like the rest of
 * [ApplicationProperties] - the encoder bean is built once at startup from these, so changing any
 * of them needs a restart.
 *
 * A password's stored hash embeds the parameters it was created with (the PHC string format), so
 * `matches` keeps verifying an existing hash correctly no matter what this changes to - only
 * `encode` (a login with a new/changed password) picks up new values immediately. An existing
 * user's hash is migrated onto the current parameters lazily, the next time they log in
 * successfully, rather than needing a bulk rehash or a forced reset - see
 * `TafelLoginProvider.additionalAuthenticationChecks`.
 */
data class SecurityArgon2Properties(
    val saltLength: Int = 16,
    val hashLength: Int = 32,
    val parallelism: Int = 1,
    val memory: Int = 131072,
    val iterations: Int = 3,
)
