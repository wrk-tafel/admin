package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationToken
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.InsufficientAuthenticationException
import org.springframework.security.web.util.matcher.RequestMatcher
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse

@ExtendWith(MockKExtension::class)
class JwtAuthenticationFilterTest {

    @RelaxedMockK
    private lateinit var requestMatcher: RequestMatcher

    @RelaxedMockK
    private lateinit var authenticationManager: AuthenticationManager

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @InjectMockKs
    private lateinit var jwtAuthenticationFilter: JwtAuthenticationFilter

    @Test
    fun `attemptAuthentication - missing header`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns null

        assertThrows<InsufficientAuthenticationException> {
            jwtAuthenticationFilter.attemptAuthentication(request, response)
        }
    }

    @Test
    fun `attemptAuthentication - missing token`() {
        assertThrows<InsufficientAuthenticationException> {
            jwtAuthenticationFilter.attemptAuthentication(request, response)
        }
    }

    @Test
    fun `attemptAuthentication - missing bearer prefix`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "TOKEN"

        assertThrows<InsufficientAuthenticationException> {
            jwtAuthenticationFilter.attemptAuthentication(request, response)
        }
    }

    @Test
    fun `attemptAuthentication - correct token given`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Bearer TOKEN"

        jwtAuthenticationFilter.attemptAuthentication(request, response)

        verify {
            authenticationManager.authenticate(withArg<JwtAuthenticationToken> {
                assertThat(it.tokenValue).isEqualTo("TOKEN")
            })
        }
    }

}
