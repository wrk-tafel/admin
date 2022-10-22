package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.security.components.JwtAuthenticationFilter
import at.wrk.tafel.admin.backend.security.components.JwtAuthenticationProvider
import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.components.TafelUserDetailsManager
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
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.UserDetailsManager
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.util.matcher.AntPathRequestMatcher

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
        auth.userDetailsService(userDetailsManager()).passwordEncoder(passwordEncoder())
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return Argon2PasswordEncoder()
    }

    @Bean
    fun userDetailsManager(): UserDetailsManager {
        return TafelUserDetailsManager(userRepository)
    }

    @Bean
    fun jwtAuthenticationFilter(): JwtAuthenticationFilter {
        val requestMatcher = AntPathRequestMatcher("/api/**")

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
