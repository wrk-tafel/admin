package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.common.auth.components.JwtAuthenticationFilter
import at.wrk.tafel.admin.backend.common.auth.components.JwtAuthenticationProvider
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import org.passay.*
import org.passay.dictionary.ArrayWordList
import org.passay.dictionary.WordListDictionary
import org.passay.dictionary.sort.ArraysSort
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.DelegatingPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.util.matcher.AndRequestMatcher
import org.springframework.security.web.util.matcher.AntPathRequestMatcher
import org.springframework.security.web.util.matcher.NegatedRequestMatcher

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
@ExcludeFromTestCoverage
class WebSecurityConfig(
    @Value("\${security.enable-csrf:true}")
    private val csrfEnabled: Boolean,
    private val jwtTokenService: JwtTokenService,
    private val userRepository: UserRepository
) : WebSecurityConfigurerAdapter() {

    companion object {
        val passwordValidator = PasswordValidator(
            listOf(
                LengthRule(8, 50),
                UsernameRule(),
                WhitespaceRule(),
                DictionarySubstringRule(
                    WordListDictionary(
                        ArrayWordList(
                            listOf("wrk", "örk", "oerk", "tafel", "roteskreuz", "toet", "töt", "1030")
                                .toTypedArray(), false, ArraysSort()
                        )
                    )
                )
            )
        )
    }

    override fun configure(http: HttpSecurity) {
        http
            .formLogin()
            .loginPage("/api/login")
            .successForwardUrl("/api/token")
            .failureHandler { _, response, _ ->
                response.status = HttpStatus.FORBIDDEN.value()
            }
            .and()
            .authenticationProvider(jwtAuthenticationProvider())
            .exceptionHandling() // make sure we use stateless session; session won't be used to store user's state.
            .authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            .and().sessionManagement()
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)

        if (csrfEnabled) {
            http.csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringAntMatchers("/api/login")
        } else {
            http.csrf().disable()
        }

        http.addFilterAfter(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter::class.java)
    }

    override fun configure(auth: AuthenticationManagerBuilder) {
        auth.userDetailsService(userDetailsManager())
            .passwordEncoder(passwordEncoder())
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return DelegatingPasswordEncoder("argon2", mapOf("argon2" to Argon2PasswordEncoder()))
    }

    @Bean
    fun userDetailsManager(): UserDetailsManager {
        return TafelUserDetailsManager(userRepository, passwordEncoder(), passwordValidator)
    }

    @Bean
    fun jwtAuthenticationFilter(): JwtAuthenticationFilter {
        val requestMatcher = AndRequestMatcher(
            AntPathRequestMatcher("/api/**"),
            NegatedRequestMatcher(AntPathRequestMatcher("/api/websockets/**"))
        )

        val filter = JwtAuthenticationFilter(requestMatcher, authenticationManagerBean())
        // We do not need to do anything extra on REST authentication success, because there is no page to redirect to
        filter.setAuthenticationSuccessHandler { _, _, _ -> }
        return filter
    }

    @Bean
    fun jwtAuthenticationProvider(): JwtAuthenticationProvider {
        return JwtAuthenticationProvider(jwtTokenService, userDetailsManager())
    }

    @Bean
    override fun authenticationManagerBean(): AuthenticationManager {
        return super.authenticationManagerBean()
    }

}
