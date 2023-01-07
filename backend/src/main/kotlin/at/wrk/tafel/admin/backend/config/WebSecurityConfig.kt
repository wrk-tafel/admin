package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.*
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.passay.*
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.ProviderManager
import org.springframework.security.authorization.AuthorizationDecision
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.DelegatingPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@ExcludeFromTestCoverage
class WebSecurityConfig(
    @Value("\${security.enable-csrf:true}") private val csrfEnabled: Boolean,
    private val jwtTokenService: JwtTokenService,
    private val userRepository: UserRepository,
    private val applicationProperties: ApplicationProperties,
    private val objectMapper: ObjectMapper
) {

    companion object {
        val passwordValidator = PasswordValidator(
            listOf(
                LengthRule(8, 50),
                UsernameRule(),
                WhitespaceRule(),
                DictionarySubstringRule(
                    WordListDictionary(
                        ArrayWordList(
                            listOf("wrk", "örk", "oerk", "tafel", "roteskreuz", "toet", "töt", "1030").toTypedArray(),
                            false,
                            ArraysSort()
                        )
                    )
                )
            )
        )
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val authFilter = AuthenticationFilter(authenticationManager(), tafelJwtAuthConverter())
        // TODO maybe better to use a BasicAuthenticationFilter and write an entryPoint instead a provider
        // TODO would make this empty handler obsolete
        authFilter.successHandler = NoOpAuthenticationSuccessHandler()

        http
            .addFilter(
                TafelLoginFilter(
                    authenticationManager = authenticationManager(),
                    jwtTokenService = jwtTokenService,
                    applicationProperties = applicationProperties,
                    objectMapper = objectMapper
                )
            )
            .addFilterAfter(authFilter, TafelLoginFilter::class.java)
            .authorizeHttpRequests { auth ->
                auth.requestMatchers("/api/login", "/api/websockets").permitAll()
                auth.requestMatchers("/api/**").authenticated()
                auth.anyRequest().permitAll()
            }
            .sessionManagement()
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)

        if (csrfEnabled) {
            http.csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/login", "/api/websockets")
        } else {
            http.csrf().disable()
        }

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        val argon2PasswordEncoder = Argon2PasswordEncoder(16, 32, 1, 16384, 2)
        return DelegatingPasswordEncoder("argon2", mapOf("argon2" to argon2PasswordEncoder))
    }

    @Bean
    fun userDetailsManager(): UserDetailsManager {
        return TafelUserDetailsManager(userRepository, passwordEncoder(), passwordValidator)
    }

    @Bean
    fun authenticationManager(): AuthenticationManager {
        return ProviderManager(tafelLoginProvider(), tafelJwtAuthProvider())
    }

    @Bean
    fun tafelLoginProvider(): TafelLoginProvider {
        return TafelLoginProvider(userDetailsManager(), passwordEncoder())
    }

    @Bean
    fun tafelJwtAuthProvider(): TafelJwtAuthProvider {
        return TafelJwtAuthProvider(jwtTokenService)
    }

    @Bean
    fun tafelJwtAuthConverter(): TafelJwtAuthConverter {
        return TafelJwtAuthConverter()
    }

}
