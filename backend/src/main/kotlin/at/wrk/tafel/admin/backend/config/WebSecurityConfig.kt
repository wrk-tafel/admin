package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.*
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
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
    private val jwtTokenService: JwtTokenService,
    private val userRepository: UserRepository,
    private val employeeRepository: EmployeeRepository,
    private val applicationProperties: ApplicationProperties,
    private val tafelAdminProperties: TafelAdminProperties,
    private val jsonMapper: JsonMapper,
    private val loginAttemptService: LoginAttemptService,
    private val clock: Clock,
) {

    companion object {
        // Reachable without a JWT cookie. Listing an endpoint here does two things at once: it
        // permits the request, and it excludes the path from TafelJwtAuthenticationFilter below -
        // which matters because TafelJwtAuthConverter rejects a cookie-less request outright
        // instead of letting it through unauthenticated.
        private val publicEndpoints = listOf("/api/login", "/api/logout", "/api/config/public")

        val passwordLengthRule = LengthRule(8, 50)
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
            ),
        )
        val generatedPasswordCharactersRules = listOf(
            CharacterRule(GermanCharacterData.LowerCase),
            CharacterRule(GermanCharacterData.UpperCase),
            CharacterRule(EnglishCharacterData.Digit),
        )
    }

    @Bean
    fun tafelPasswordGenerator(): TafelPasswordGenerator = TafelPasswordGenerator(passwordLengthRule.minimumLength + 2, generatedPasswordCharactersRules)

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val authFilter = TafelJwtAuthenticationFilter(
            authenticationManager = authenticationManager(),
            authenticationConverter = tafelJwtAuthConverter(),
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
            .addFilter(
                TafelLoginFilter(
                    authenticationManager = authenticationManager(),
                    jwtTokenService = jwtTokenService,
                    applicationProperties = applicationProperties,
                    tafelAdminProperties = tafelAdminProperties,
                    jsonMapper = jsonMapper,
                ),
            )
            .addFilterAfter(authFilter, TafelLoginFilter::class.java)
            .authorizeHttpRequests { auth ->
                // SSE endpoints (SseEmitter) keep the request open via request.startAsync(); when
                // the emitter completes/times out/errors, the container re-enters the filter chain
                // on an ASYNC dispatch to finish the request. TafelJwtAuthenticationFilter (a
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
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .exceptionHandling { exceptionHandling ->
                exceptionHandling.accessDeniedHandler(TafelAccessDeniedHandler())
            }
            .csrf { csrf ->
                val cookieTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse()
                cookieTokenRepository.setCookieCustomizer { it.sameSite("Strict") }
                val tokenRepository = SessionBoundCsrfTokenRepository(
                    delegate = cookieTokenRepository,
                    secret = applicationProperties.security.jwtToken.secret.value,
                )

                csrf.csrfTokenRepository(tokenRepository)
                csrf.csrfTokenRequestHandler(SpaCsrfTokenRequestHandler())
                // login authenticates via the Authorization header, which cross-site requests
                // cannot set - and the client has no token yet at that point
                csrf.ignoringRequestMatchers(PathPatternRequestMatcher.pathPattern("/api/login"))
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
            }

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        val argon2PasswordEncoder = Argon2PasswordEncoder(16, 32, 1, 16384, 2)
        return DelegatingPasswordEncoder("argon2", mapOf("argon2" to argon2PasswordEncoder))
    }

    @Bean
    fun tafelUserDetailsManager(): TafelUserDetailsManager = TafelUserDetailsManager(userRepository, employeeRepository, passwordEncoder(), passwordValidator, tafelAdminProperties)

    @Bean
    fun authenticationManager(): AuthenticationManager = ProviderManager(tafelLoginProvider(), tafelJwtAuthProvider())

    @Bean
    fun tafelLoginProvider(): TafelLoginProvider = TafelLoginProvider(tafelUserDetailsManager(), passwordEncoder(), loginAttemptService, userRepository, clock)

    @Bean
    fun tafelJwtAuthProvider(): TafelJwtAuthProvider = TafelJwtAuthProvider(jwtTokenService, userRepository)

    @Bean
    fun tafelJwtAuthConverter(): TafelJwtAuthConverter = TafelJwtAuthConverter()
}
