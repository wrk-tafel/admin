package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.*
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditActorProvider
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.common.search.SearchTermNormalizer
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import jakarta.servlet.DispatcherType
import org.passay.DefaultPasswordValidator
import org.passay.data.EnglishCharacterData
import org.passay.data.GermanCharacterData
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.passay.rule.*
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.ProviderManager
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.DelegatingPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import org.springframework.security.web.util.matcher.AndRequestMatcher
import org.springframework.security.web.util.matcher.NegatedRequestMatcher
import org.springframework.security.web.util.matcher.OrRequestMatcher
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@ExcludeFromTestCoverage
class WebSecurityConfig(
    private val userSessionService: UserSessionService,
    private val userRepository: UserRepository,
    private val applicationProperties: ApplicationProperties,
    private val tafelAdminProperties: TafelAdminProperties,
    private val jsonMapper: JsonMapper,
    private val loginAttemptService: LoginAttemptService,
    private val loginAttemptIpService: LoginAttemptIpService,
    private val loginAuditService: LoginAuditService,
    private val rateLimiterIpService: RateLimiterIpService,
    private val auditLogWriter: AuditLogWriter,
    private val auditLogRepository: AuditLogRepository,
    private val auditActorProvider: AuditActorProvider,
    private val clock: Clock,
    private val advisoryLockService: AdvisoryLockService,
    private val mfaEmailCodeService: MfaEmailCodeService,
    private val searchTermNormalizer: SearchTermNormalizer,
) {

    companion object {
        // Reachable without a session. Listing an endpoint here does two things at once: it permits
        // the request, and it excludes the path from TafelSessionAuthenticationFilter below - which
        // matters because TafelSessionAuthConverter rejects a session-less request outright instead
        // of letting it through unauthenticated, and because it keeps these requests from loading a
        // session at all.
        private const val LOGIN_ENDPOINT = "/api/login"
        private const val PASSWORD_RESET_ENDPOINTS = "/api/password-reset/*"
        private val publicEndpoints = listOf(LOGIN_ENDPOINT, "/api/config/public", PASSWORD_RESET_ENDPOINTS)

        val passwordLengthRule = LengthRule(8, 50)

        // Same three character classes a generated password is already built from (see
        // tafelPasswordGenerator below) - required here too via CharacterCharacteristicsRule so a
        // user-chosen password can't fall below what a generated one always guarantees.
        val generatedPasswordCharactersRules = listOf(
            CharacterRule(GermanCharacterData.LowerCase),
            CharacterRule(GermanCharacterData.UpperCase),
            CharacterRule(EnglishCharacterData.Digit),
        )
        val passwordValidator = DefaultPasswordValidator(
            listOf(
                passwordLengthRule,
                UsernameRule(),
                WhitespaceRule(),
                DictionarySubstringRule(
                    WordListDictionary(
                        ArrayWordList(
                            listOf("wrk", "örk", "oerk", "tafel", "roteskreuz", "toet", "töt", "1030").toTypedArray(),
                            false,
                            ArraysSort(),
                        ),
                    ),
                ),
                CharacterCharacteristicsRule(generatedPasswordCharactersRules.size, generatedPasswordCharactersRules),
            ),
        )
    }

    @Bean
    fun tafelPasswordGenerator(): TafelPasswordGenerator = TafelPasswordGenerator(passwordLengthRule.minimumLength + 2, generatedPasswordCharactersRules)

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val authFilter = TafelSessionAuthenticationFilter(
            authenticationManager = authenticationManager(),
            authenticationConverter = TafelSessionAuthConverter(),
            requestMatcher = AndRequestMatcher(
                PathPatternRequestMatcher.pathPattern("/api/**"),
                NegatedRequestMatcher(
                    OrRequestMatcher(
                        publicEndpoints.map {
                            PathPatternRequestMatcher.pathPattern(it)
                        },
                    ),
                ),
            ),
        )

        http
            .addFilterBefore(
                RateLimitFilter(
                    requestMatcher = PathPatternRequestMatcher.pathPattern(HttpMethod.POST, LOGIN_ENDPOINT),
                    scope = "login",
                    rateLimiterService = rateLimiterIpService,
                ),
                TafelLoginFilter::class.java,
            )
            .addFilterBefore(
                RateLimitFilter(
                    // the code has a million possible values - the per-user lockout is what stops a search, this
                    // keeps one address from running it against every account at once
                    requestMatcher = OrRequestMatcher(
                        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/verify"),
                        // a login can also have a mail sent - the cooldown per user is in MfaEmailCodeService
                        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/email/send"),
                    ),
                    scope = "mfa",
                    rateLimiterService = rateLimiterIpService,
                ),
                TafelLoginFilter::class.java,
            )
            .addFilterBefore(
                RateLimitFilter(
                    // anonymous and mails something - the cooldown per account is in PasswordResetService
                    requestMatcher = PathPatternRequestMatcher.pathPattern(HttpMethod.POST, PASSWORD_RESET_ENDPOINTS),
                    scope = "passwordReset",
                    rateLimiterService = rateLimiterIpService,
                ),
                TafelLoginFilter::class.java,
            )
            .addFilterBefore(
                RateLimitFilter(
                    requestMatcher = PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/support"),
                    scope = "support",
                    rateLimiterService = rateLimiterIpService,
                ),
                TafelLoginFilter::class.java,
            )
            .addFilterBefore(
                RateLimitFilter(
                    requestMatcher = PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/client-errors"),
                    scope = "clientError",
                    rateLimiterService = rateLimiterIpService,
                ),
                TafelLoginFilter::class.java,
            )
            .addFilter(
                TafelLoginFilter(
                    authenticationManager = authenticationManager(),
                    userSessionService = userSessionService,
                    jsonMapper = jsonMapper,
                    mfaEmailCodeService = mfaEmailCodeService,
                ),
            )
            .addFilterAfter(authFilter, TafelLoginFilter::class.java)
            .addFilterAfter(MfaPendingFilter(), TafelSessionAuthenticationFilter::class.java)
            .authorizeHttpRequests { auth ->
                // SSE endpoints (SseEmitter) keep the request open via request.startAsync(); when
                // the emitter completes/times out/errors, the container re-enters the filter chain
                // on an ASYNC dispatch to finish the request. TafelSessionAuthenticationFilter (a
                // OncePerRequestFilter) skips re-authenticating on that dispatch by default, so
                // without this, AuthorizationFilter - which runs on every dispatch type, unlike
                // OncePerRequestFilter - sees no authentication and denies it, even though the
                // original REQUEST dispatch already authenticated/authorized before the stream
                // opened.
                auth.dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                auth.requestMatchers(*publicEndpoints.toTypedArray()).permitAll()
                auth.requestMatchers("/api/**").authenticated()
                auth.anyRequest().permitAll()
            }
            // Spring Security itself keeps nothing in the session - no serialized SecurityContext, no saved
            // request. The login session (Spring Session JDBC, ADR-0070) is opened by TafelLoginFilter, holds
            // strings only (TafelSessionAttributes), and the Authentication is rebuilt from it per request.
            //
            // Spring Security's own session fixation protection is off: it would see the Authentication that
            // TafelSessionAuthenticationFilter sets as a login happening on this very request and change the session
            // id on every one of them. UserSessionService does it where it belongs instead - a new session at the
            // login, a new id once the second factor was passed.
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                it.sessionFixation { fixation -> fixation.none() }
            }
            .exceptionHandling { exceptionHandling ->
                exceptionHandling.accessDeniedHandler(TafelAccessDeniedHandler())
            }
            .csrf { csrf ->
                val cookieTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse()
                cookieTokenRepository.setCookieCustomizer { it.sameSite("Strict") }
                val tokenRepository = SessionBoundCsrfTokenRepository(
                    delegate = cookieTokenRepository,
                    sessionCookieName = TafelSessionAttributes.COOKIE_NAME,
                )

                csrf.csrfTokenRepository(tokenRepository)
                csrf.csrfTokenRequestHandler(SpaCsrfTokenRequestHandler())
                // login authenticates via the Authorization header, which cross-site requests
                // cannot set - and the client has no token yet at that point
                csrf.ignoringRequestMatchers(PathPatternRequestMatcher.pathPattern(LOGIN_ENDPOINT))
                // reached without a session, so there is no session a forged request could ride on:
                // asking for a link only mails the account's own address, and setting a password takes
                // the token from that mail, which a cross-site page cannot know (ADR-0072)
                csrf.ignoringRequestMatchers(PathPatternRequestMatcher.pathPattern(PASSWORD_RESET_ENDPOINTS))
            }
            .headers { headers ->
                headers.contentSecurityPolicy {
                    // style-src needs 'unsafe-inline' because Angular injects component styles
                    // as inline <style> tags
                    val policyDirectives = """
                        default-src 'self';
                        script-src 'self';
                        style-src 'self' 'unsafe-inline';
                        img-src 'self' data: blob:;
                        font-src 'self' data:;
                        connect-src 'self';
                        object-src 'none';
                        frame-ancestors 'none';
                        base-uri 'self';
                        form-action 'self'
                    """.trimIndent().lines().joinToString(" ")

                    it.policyDirectives(policyDirectives)
                }
                // Never send this app's URL to another origin, not even same-site over a scheme
                // downgrade - the app never needs the referrer read on the other end, and
                // households/employees/tickets are identifiable straight from the path.
                headers.referrerPolicy { it.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER) }
                // Deny every permission this app has no use for. camera stays allowed for same
                // origin - the checkin module's QR scanner (zxing) depends on it - and
                // clipboard-write for the "copy generated password" action on the user form.
                headers.permissionsPolicyHeader {
                    it.policy(
                        listOf(
                            "geolocation=()",
                            "microphone=()",
                            "payment=()",
                            "usb=()",
                            "camera=(self)",
                            "clipboard-write=(self)",
                        ).joinToString(", "),
                    )
                }
            }

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        val argon2Properties = applicationProperties.security.argon2
        val argon2PasswordEncoder = Argon2PasswordEncoder(
            argon2Properties.saltLength,
            argon2Properties.hashLength,
            argon2Properties.parallelism,
            argon2Properties.memory,
            argon2Properties.iterations,
        )
        return DelegatingPasswordEncoder("argon2", mapOf("argon2" to argon2PasswordEncoder))
    }

    @Bean
    fun tafelUserDetailsManager(): TafelUserDetailsManager = TafelUserDetailsManager(
        userRepository,
        passwordEncoder(),
        passwordValidator,
        tafelAdminProperties,
        loginAttemptService,
        auditLogWriter,
        auditLogRepository,
        auditActorProvider,
        clock,
        advisoryLockService,
        searchTermNormalizer,
    )

    @Bean
    fun authenticationManager(): AuthenticationManager = ProviderManager(tafelLoginProvider(), tafelSessionAuthProvider())

    @Bean
    fun tafelLoginProvider(): TafelLoginProvider = TafelLoginProvider(
        tafelUserDetailsManager(),
        passwordEncoder(),
        loginAttemptService,
        loginAttemptIpService,
        loginAuditService,
        tafelUserDetailsManager()::upgradePasswordHash,
    )

    @Bean
    fun tafelSessionAuthProvider(): TafelSessionAuthProvider = TafelSessionAuthProvider(userRepository, tafelAdminProperties, applicationProperties, clock)
}
