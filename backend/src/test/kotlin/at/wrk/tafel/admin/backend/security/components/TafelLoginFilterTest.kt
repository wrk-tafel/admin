package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.MfaEmailCodeService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.UserSessionService
import at.wrk.tafel.admin.backend.common.auth.model.LoginResponse
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
    private lateinit var userSessionService: UserSessionService

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @RelaxedMockK
    private lateinit var mfaEmailCodeService: MfaEmailCodeService

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
    fun `successfulAuthentication when login is successful opens a full session`() {
        every { authResult.principal } returns testUser

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { userSessionService.startSession(request, testUser.username, false) }
        verify {
            jsonMapper.writeValueAsString(
                withArg<LoginResponse> { response ->
                    assertThat(response.passwordChangeRequired).isFalse()
                    assertThat(response.mfaRequired).isFalse()
                },
            )
        }
    }

    @Test
    fun `successfulAuthentication when passwordChange is required opens a pending session`() {
        every { authResult.principal } returns testUser.copy(passwordChangeRequired = true)

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { userSessionService.startSession(request, testUser.username, true) }
        verify {
            jsonMapper.writeValueAsString(
                withArg<LoginResponse> { response ->
                    assertThat(response.passwordChangeRequired).isTrue()
                },
            )
        }
    }

    @Test
    fun `successfulAuthentication when a second factor is required opens a pending session and says so`() {
        every { authResult.principal } returns testUser.copy(mfaTotpEnabled = true, mfaEmailEnabled = true)

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { userSessionService.startSession(request, testUser.username, true) }
        verify {
            jsonMapper.writeValueAsString(
                withArg<LoginResponse> { body ->
                    assertThat(body.mfaRequired).isTrue()
                    assertThat(body.mfaMethods).containsExactly("TOTP", "EMAIL")
                    assertThat(body.passwordChangeRequired).isFalse()
                },
            )
        }
    }

    @Test
    fun `successfulAuthentication discards an e-mailed code left over from an earlier login`() {
        every { authResult.principal } returns testUser.copy(mfaEmailEnabled = true)

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 1) { mfaEmailCodeService.discard(testUser.id!!) }
    }

    @Test
    fun `successfulAuthentication leaves the e-mailed codes alone for a user without the e-mail method`() {
        every { authResult.principal } returns testUser.copy(mfaTotpEnabled = true)

        tafelLoginFilter.successfulAuthentication(request, response, filterChain, authResult)

        verify(exactly = 0) { mfaEmailCodeService.discard(any()) }
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
