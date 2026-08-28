package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.web.util.matcher.RequestMatcher
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Rejects a request with `429` once [rateLimiterService] says the calling IP has spent its budget for
 * [scope] - in front of `/api/login` (unauthenticated, so username-based lockout is the only other
 * brake on it) and `/api/support` (authenticated, but a single call can still queue a multi-megabyte
 * mail). [requestMatcher] scopes which requests this instance applies to, the same pattern
 * [TafelJwtAuthenticationFilter] uses, so one filter class is registered once per protected endpoint
 * rather than branching on the path internally.
 */
class RateLimitFilter(
    private val requestMatcher: RequestMatcher,
    private val scope: String,
    private val rateLimiterService: RateLimiterIpService,
) : OncePerRequestFilter() {

    companion object {
        private val log = LoggerFactory.getLogger(RateLimitFilter::class.java)
    }

    public override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        if (!requestMatcher.matches(request)) {
            filterChain.doFilter(request, response)
            return
        }

        if (rateLimiterService.tryConsume(scope, request.remoteAddr)) {
            filterChain.doFilter(request, response)
        } else {
            log.warn("Rate limit exceeded for scope '{}' from IP '{}'", scope, sanitizeForLog(request.remoteAddr))
            response.status = HttpStatus.TOO_MANY_REQUESTS.value()
        }
    }
}
