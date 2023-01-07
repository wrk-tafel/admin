package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.model.JwtAuthenticationResponse
import at.wrk.tafel.admin.backend.config.ApplicationProperties
import at.wrk.tafel.admin.backend.security.testUser
import com.fasterxml.jackson.databind.ObjectMapper
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.Authentication

@ExtendWith(MockKExtension::class)
class TafelLoginFilterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @RelaxedMockK
    private lateinit var filterChain: FilterChain

    @RelaxedMockK
    private lateinit var authenticationManager: AuthenticationManager

    @RelaxedMockK
    private lateinit var authResult: Authentication

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    @RelaxedMockK
    private lateinit var applicationProperties: ApplicationProperties

    @RelaxedMockK
    private lateinit var objectMapper: ObjectMapper

    @InjectMockKs
    private lateinit var tafelLoginFilter: TafelLoginFilter

    @Test
    fun `obtainUsername reads username from basic auth`() {
        // user:pwd
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Basic dXNlcjpwd2Q="

        val username = tafelLoginFilter.obtainUsername(request)

        assertThat(username).isEqualTo("user")
    }

    @Test
    fun `obtainPassword reads password from basic auth`() {
        // user:pwd
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Basic dXNlcjpwd2Q="

        val username = tafelLoginFilter.obtainPassword(request)

        assertThat(username).isEqualTo("pwd")
    }

    @Test
    fun `successfulAuthentication when login is successful`() {
        every { authResult.principal } returns testUser
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "TOKEN"
        every { applicationProperties.security.jwtToken.expirationTimeInSeconds } returns 10000

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { jwtTokenService.generateToken(testUser.username, testUser.authorities, 10000) }
        verify {
            objectMapper.writeValueAsString(withArg<JwtAuthenticationResponse> {
                assertThat(it.token).isEqualTo("TOKEN")
                assertThat(it.passwordChangeRequired).isFalse()
            })
        }
    }

    @Test
    fun `successfulAuthentication when passwordChange is required`() {
        every { authResult.principal } returns testUser.copy(passwordChangeRequired = true)
        every { jwtTokenService.generateToken(any(), any(), any()) } returns "TOKEN"
        every { applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds } returns 5000

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { jwtTokenService.generateToken(testUser.username, emptyList(), 5000) }
        verify {
            objectMapper.writeValueAsString(withArg<JwtAuthenticationResponse> {
                assertThat(it.token).isEqualTo("TOKEN")
                assertThat(it.passwordChangeRequired).isTrue()
            })
        }
    }

}
