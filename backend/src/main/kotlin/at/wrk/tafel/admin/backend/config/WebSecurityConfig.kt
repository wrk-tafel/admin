package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.NoOpAuthenticationSuccessHandler
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginProvider
import at.wrk.tafel.admin.backend.common.auth.components.TafelPasswordGenerator
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.passay.CharacterRule
import org.passay.DictionarySubstringRule
import org.passay.EnglishCharacterData
import org.passay.GermanCharacterData
import org.passay.LengthRule
import org.passay.PasswordValidator
import org.passay.UsernameRule
import org.passay.WhitespaceRule
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
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
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationFilter
import org.springframework.security.web.util.matcher.AndRequestMatcher
import org.springframework.security.web.util.matcher.AntPathRequestMatcher
import org.springframework.security.web.util.matcher.NegatedRequestMatcher
import org.springframework.security.web.util.matcher.OrRequestMatcher

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@ExcludeFromTestCoverage
class WebSecurityConfig(
    private val jwtTokenService: JwtTokenService,
    private val userRepository: UserRepository,
    private val employeeRepository: EmployeeRepository,
    private val applicationProperties: ApplicationProperties,
    private val objectMapper: ObjectMapper
) {

    companion object {
        private val publicEndpoints = listOf("/api/login", "/api/logout", "/api/websockets")

        val passwordLengthRule = LengthRule(8, 50)
        val passwordValidator = PasswordValidator(
            listOf(
                passwordLengthRule,
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
        val generatedPasswordCharactersRules = listOf(
            CharacterRule(GermanCharacterData.LowerCase),
            CharacterRule(GermanCharacterData.UpperCase),
            CharacterRule(EnglishCharacterData.Digit)
        )
    }

    @Bean
    fun tafelPasswordGenerator(): TafelPasswordGenerator {
        return TafelPasswordGenerator(passwordLengthRule.minimumLength + 2, generatedPasswordCharactersRules)
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val authFilter = AuthenticationFilter(authenticationManager(), tafelJwtAuthConverter())
        authFilter.requestMatcher = AndRequestMatcher(
            AntPathRequestMatcher("/api/**"),
            NegatedRequestMatcher(
                OrRequestMatcher(
                    publicEndpoints.map {
                        AntPathRequestMatcher(it)
                    }
                )
            )
        )
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
                auth.requestMatchers(*publicEndpoints.toTypedArray()).permitAll()
                auth.requestMatchers("/api/**").authenticated()
                auth.anyRequest().permitAll()
            }
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .csrf {
                it.disable()
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
        return tafelUserDetailsManager()
    }

    @Bean
    fun tafelUserDetailsManager(): TafelUserDetailsManager {
        return TafelUserDetailsManager(userRepository, employeeRepository, passwordEncoder(), passwordValidator)
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
