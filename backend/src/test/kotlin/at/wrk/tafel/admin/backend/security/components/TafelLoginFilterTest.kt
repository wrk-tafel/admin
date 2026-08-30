package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.model.LoginResponse
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties
import at.wrk.tafel.admin.backend.security.testUser
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.LockedException
import org.springframework.security.core.Authentication
import tools.jackson.databind.json.JsonMapper

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
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

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
    fun `obtainUsername fails with a handled authentication exception when the Authorization header is missing`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns null

        assertThatThrownBy { tafelLoginFilter.obtainUsername(request) }
            .isInstanceOf(BadCredentialsException::class.java)
    }

    @Test
    fun `obtainPassword fails with a handled authentication exception when the Authorization header is missing`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns null

        assertThatThrownBy { tafelLoginFilter.obtainPassword(request) }
            .isInstanceOf(BadCredentialsException::class.java)
    }

    @Test
    fun `obtainUsername fails with a handled authentication exception when the Authorization header is not Basic`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Bearer sometoken"

        assertThatThrownBy { tafelLoginFilter.obtainUsername(request) }
            .isInstanceOf(BadCredentialsException::class.java)
    }

    @Test
    fun `successfulAuthentication when login is successful`() {
        val token = "TOKEN"
        val expirationTime = 10000
        val relativeBaseUrl = "/test-base/"

        every { authResult.principal } returns testUser
        every { jwtTokenService.generateToken(any(), any()) } returns token
        every { applicationProperties.security.jwtToken.expirationTimeInSeconds } returns expirationTime
        every { tafelAdminProperties.server } returns TafelAdminServerProperties().apply { this.relativeBaseUrl = relativeBaseUrl }

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { jwtTokenService.generateToken(testUser.username, expirationTime) }

        verify {
            jsonMapper.writeValueAsString(
                withArg<LoginResponse> { response ->
                    assertThat(response.passwordChangeRequired).isFalse()
                },
            )
        }

        verify {
            response.addCookie(
                withArg {
                    assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                    assertThat(it.value).isEqualTo(token)
                    assertThat(it.maxAge).isEqualTo(expirationTime)
                    assertThat(it.path).isEqualTo(relativeBaseUrl)
                    assertThat(it.attributes["SameSite"]).isEqualTo("strict")
                },
            )
        }
    }

    @Test
    fun `successfulAuthentication when passwordChange is required`() {
        val token = "TOKEN"
        val expirationTime = 5000
        val relativeBaseUrl = "/test-base/"

        every { authResult.principal } returns testUser.copy(passwordChangeRequired = true)
        every { jwtTokenService.generateToken(any(), any()) } returns token
        every { applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds } returns expirationTime
        every { tafelAdminProperties.server } returns TafelAdminServerProperties().apply { this.relativeBaseUrl = relativeBaseUrl }

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { jwtTokenService.generateToken(testUser.username, expirationTime) }
        verify {
            jsonMapper.writeValueAsString(
                withArg<LoginResponse> { response ->
                    assertThat(response.passwordChangeRequired).isTrue()
                },
            )
        }

        verify {
            response.addCookie(
                withArg {
                    assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                    assertThat(it.value).isEqualTo(token)
                    assertThat(it.maxAge).isEqualTo(expirationTime)
                    assertThat(it.path).isEqualTo(relativeBaseUrl)
                    assertThat(it.attributes["SameSite"]).isEqualTo("strict")
                },
            )
        }
    }

    @Test
    fun `unsuccessfulAuthentication with wrong credentials responds with 403`() {
        tafelLoginFilter.unsuccessfulAuthentication(request, response, BadCredentialsException("wrong password"))

        verify { response.status = HttpStatus.FORBIDDEN.value() }
    }

    @Test
    fun `unsuccessfulAuthentication with a locked account responds with the same 403 as wrong credentials`() {
        tafelLoginFilter.unsuccessfulAuthentication(request, response, LockedException("account locked"))

        verify { response.status = HttpStatus.FORBIDDEN.value() }
    }
}
