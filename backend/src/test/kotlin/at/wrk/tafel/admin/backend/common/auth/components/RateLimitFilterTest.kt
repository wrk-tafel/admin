package at.wrk.tafel.admin.backend.common.auth.components

import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.security.web.util.matcher.RequestMatcher

@ExtendWith(MockKExtension::class)
class RateLimitFilterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @RelaxedMockK
    private lateinit var filterChain: FilterChain

    @RelaxedMockK
    private lateinit var requestMatcher: RequestMatcher

    @RelaxedMockK
    private lateinit var rateLimiterService: RateLimiterIpService

    private lateinit var filter: RateLimitFilter

    @Test
    fun `doFilterInternal continues the chain and never consults the limiter when the request matcher does not match`() {
        filter = RateLimitFilter(requestMatcher, "login", rateLimiterService)
        every { requestMatcher.matches(request) } returns false

        filter.doFilterInternal(request, response, filterChain)

        verify(exactly = 1) { filterChain.doFilter(request, response) }
        verify(exactly = 0) { rateLimiterService.tryConsume(any(), any()) }
    }

    @Test
    fun `doFilterInternal continues the chain when the limiter still has budget for this ip`() {
        filter = RateLimitFilter(requestMatcher, "login", rateLimiterService)
        every { requestMatcher.matches(request) } returns true
        every { request.remoteAddr } returns "1.2.3.4"
        every { rateLimiterService.tryConsume("login", "1.2.3.4") } returns true

        filter.doFilterInternal(request, response, filterChain)

        verify(exactly = 1) { filterChain.doFilter(request, response) }
        verify(exactly = 0) { response.status = any() }
    }

    @Test
    fun `doFilterInternal sends 429 and stops the chain when the limiter is exhausted for this ip`() {
        filter = RateLimitFilter(requestMatcher, "login", rateLimiterService)
        every { requestMatcher.matches(request) } returns true
        every { request.remoteAddr } returns "1.2.3.4"
        every { rateLimiterService.tryConsume("login", "1.2.3.4") } returns false

        filter.doFilterInternal(request, response, filterChain)

        verify(exactly = 0) { filterChain.doFilter(any(), any()) }
        verify(exactly = 1) { response.status = HttpStatus.TOO_MANY_REQUESTS.value() }
    }

    @Test
    fun `doFilterInternal consults the limiter under the scope it was constructed with`() {
        filter = RateLimitFilter(requestMatcher, "support", rateLimiterService)
        every { requestMatcher.matches(request) } returns true
        every { request.remoteAddr } returns "1.2.3.4"
        every { rateLimiterService.tryConsume("support", "1.2.3.4") } returns true

        filter.doFilterInternal(request, response, filterChain)

        verify(exactly = 1) { rateLimiterService.tryConsume("support", "1.2.3.4") }
    }
}
