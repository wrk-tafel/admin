package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.JwtAuthenticationFilter
import at.wrk.tafel.admin.backend.security.components.JwtAuthenticationProvider
import at.wrk.tafel.admin.backend.security.components.UserDetailsService
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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
class WebSecurityConfig(
    private val jwtAuthenticationProvider: JwtAuthenticationProvider,
    private val userDetailsService: UserDetailsService
) : WebSecurityConfigurerAdapter() {

    override fun configure(http: HttpSecurity) {
        http.csrf().disable() // csrf anyway not possible due to jwt usage
            .formLogin()
            .successForwardUrl("/token")
            .failureHandler { _, response, _ ->
                response.status = HttpStatus.FORBIDDEN.value()
            }
            .and()
            .authorizeRequests()
            .anyRequest() // all other requests need to be authenticated
            .authenticated()
            .and()
            .authenticationProvider(jwtAuthenticationProvider)
            .exceptionHandling() // make sure we use stateless session; session won't be used to store user's state.
            .authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            .and().sessionManagement()
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)

        http.addFilterAfter(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter::class.java)
    }

    override fun configure(auth: AuthenticationManagerBuilder) {
        auth.userDetailsService(userDetailsService)
            .passwordEncoder(passwordEncoder())
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder() // TODO change to Argon2
    }

    @Bean
    override fun authenticationManagerBean(): AuthenticationManager {
        return super.authenticationManagerBean()
    }

    @Bean
    fun jwtAuthenticationFilter(): JwtAuthenticationFilter {
        val filter = JwtAuthenticationFilter(authenticationManagerBean())
        // We do not need to do anything extra on REST authentication success, because there is no page to redirect to
        filter.setAuthenticationSuccessHandler { _, _, _ -> }
        return filter
    }

}
