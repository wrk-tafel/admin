package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.JwtAuthenticationToken
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.InsufficientAuthenticationException
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter
import org.springframework.security.web.util.matcher.RequestMatcher
import javax.servlet.FilterChain
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse

class JwtAuthenticationFilter(
    requestMatcher: RequestMatcher,
    configuredAuthenticationManager: AuthenticationManager
) : AbstractAuthenticationProcessingFilter(
    requestMatcher,
    configuredAuthenticationManager
) {
    companion object {
        private const val AUTHORIZATION_PREFIX = "Bearer "
        private val logger = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)
    }

    override fun attemptAuthentication(request: HttpServletRequest, response: HttpServletResponse): Authentication {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION)

        if (header == null || !header.startsWith(AUTHORIZATION_PREFIX)) {
            logger.info("Failed authentication attempt on ${request.requestURI}")
            throw InsufficientAuthenticationException("no token given")
        }

        val jwtTokenString = header.substringAfter(AUTHORIZATION_PREFIX)
        val authRequest = JwtAuthenticationToken(
            tokenValue = jwtTokenString
        )

        return authenticationManager.authenticate(authRequest)
    }

    @ExcludeFromTestCoverage
    override fun successfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
        authResult: Authentication
    ) {
        super.successfulAuthentication(request, response, chain, authResult)

        // As this authentication is in HTTP header, after success we need to continue the request normally
        // and return the response as if the resource was not secured at all
        chain.doFilter(request, response)
    }

    @ExcludeFromTestCoverage
    override fun unsuccessfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        failed: AuthenticationException
    ) {
        super.unsuccessfulAuthentication(request, response, failed)
    }
}
