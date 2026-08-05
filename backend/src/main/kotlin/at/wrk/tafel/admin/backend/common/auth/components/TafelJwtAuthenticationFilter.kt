package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.AuthenticationConverter
import org.springframework.security.web.util.matcher.RequestMatcher
import org.springframework.web.filter.OncePerRequestFilter

class TafelJwtAuthenticationFilter(
    private val authenticationManager: AuthenticationManager,
    private val authenticationConverter: AuthenticationConverter,
    private val requestMatcher: RequestMatcher,
) : OncePerRequestFilter() {

    public override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        if (!requestMatcher.matches(request)) {
            filterChain.doFilter(request, response)
            return
        }

        try {
            val authRequest = authenticationConverter.convert(request)
                ?: throw AuthenticationCredentialsNotFoundException("Missing authentication credentials")
            val authResult = authenticationManager.authenticate(authRequest)
            SecurityContextHolder.getContext().authentication = authResult
            filterChain.doFilter(request, response)
        } catch (failed: AuthenticationException) {
            SecurityContextHolder.clearContext()
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED)
        }
    }
}
