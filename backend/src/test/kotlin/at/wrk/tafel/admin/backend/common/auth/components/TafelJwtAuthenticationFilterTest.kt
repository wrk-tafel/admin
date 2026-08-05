package at.wrk.tafel.admin.backend.common.auth.components

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.AuthenticationConverter
import org.springframework.security.web.util.matcher.RequestMatcher

@ExtendWith(MockKExtension::class)
class TafelJwtAuthenticationFilterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @RelaxedMockK
    private lateinit var filterChain: FilterChain

    @RelaxedMockK
    private lateinit var authenticationManager: AuthenticationManager

    @RelaxedMockK
    private lateinit var authenticationConverter: AuthenticationConverter

    @RelaxedMockK
    private lateinit var requestMatcher: RequestMatcher

    @InjectMockKs
    private lateinit var filter: TafelJwtAuthenticationFilter

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `doFilterInternal skips authentication and continues the chain when the request matcher does not match`() {
        every { requestMatcher.matches(request) } returns false

        filter.doFilterInternal(request, response, filterChain)

        verify(exactly = 1) { filterChain.doFilter(request, response) }
        verify(exactly = 0) { authenticationConverter.convert(any()) }
        verify(exactly = 0) { authenticationManager.authenticate(any()) }
    }

    @Test
    fun `doFilterInternal authenticates and continues the chain when credentials are valid`() {
        val authRequest = UsernamePasswordAuthenticationToken.unauthenticated("some-user", "credentials")
        val authResult: Authentication = UsernamePasswordAuthenticationToken.authenticated("some-user", null, emptyList())

        every { requestMatcher.matches(request) } returns true
        every { authenticationConverter.convert(request) } returns authRequest
        every { authenticationManager.authenticate(authRequest) } returns authResult

        filter.doFilterInternal(request, response, filterChain)

        assertThat(SecurityContextHolder.getContext().authentication).isSameAs(authResult)
        verify(exactly = 1) { filterChain.doFilter(request, response) }
        verify(exactly = 0) { response.sendError(any()) }
    }

    @Test
    fun `doFilterInternal clears the context and sends 401 when the converter finds no credentials`() {
        every { requestMatcher.matches(request) } returns true
        every { authenticationConverter.convert(request) } returns null

        filter.doFilterInternal(request, response, filterChain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
        verify(exactly = 1) { response.sendError(HttpServletResponse.SC_UNAUTHORIZED) }
        verify(exactly = 0) { filterChain.doFilter(any(), any()) }
    }

    @Test
    fun `doFilterInternal clears the context and sends 401 when authentication fails`() {
        val authRequest = UsernamePasswordAuthenticationToken.unauthenticated("some-user", "wrong-credentials")

        every { requestMatcher.matches(request) } returns true
        every { authenticationConverter.convert(request) } returns authRequest
        every { authenticationManager.authenticate(authRequest) } throws BadCredentialsException("bad credentials")

        filter.doFilterInternal(request, response, filterChain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
        verify(exactly = 1) { response.sendError(HttpServletResponse.SC_UNAUTHORIZED) }
        verify(exactly = 0) { filterChain.doFilter(any(), any()) }
    }
}
