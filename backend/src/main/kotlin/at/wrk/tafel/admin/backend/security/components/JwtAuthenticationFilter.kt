package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationToken
import io.jsonwebtoken.JwtException
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter
import org.springframework.security.web.util.matcher.AndRequestMatcher
import org.springframework.security.web.util.matcher.AntPathRequestMatcher
import org.springframework.security.web.util.matcher.NegatedRequestMatcher
import javax.servlet.FilterChain
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse

class JwtAuthenticationFilter(
    configuredAuthenticationManager: AuthenticationManager
) : AbstractAuthenticationProcessingFilter(
    AndRequestMatcher(
        AntPathRequestMatcher("/**"),
        NegatedRequestMatcher(AntPathRequestMatcher("/token")),
        NegatedRequestMatcher(AntPathRequestMatcher("/login"))
    )
) {

    init {
        authenticationManager = configuredAuthenticationManager
    }

    companion object {
        private const val AUTHORIZATION_PREFIX = "Bearer "
    }

    override fun attemptAuthentication(request: HttpServletRequest, response: HttpServletResponse): Authentication {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION)

        if (header == null || !header.startsWith(AUTHORIZATION_PREFIX)) {
            // TODO maybe custom JwtTokenMissingException
            throw JwtException("No JWT token found in request headers")
        }

        val jwtTokenString = header.substringAfter(AUTHORIZATION_PREFIX)
        val authRequest = JwtAuthenticationToken(
            tokenString = jwtTokenString
        )

        return authenticationManager.authenticate(authRequest)
    }

    override fun successfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
        authResult: Authentication
    ) {
        super.successfulAuthentication(request, response, chain, authResult)

        // As this authentication is in HTTP header, after success we need to continue the request normally
        // and return the response as if the resource was not secured at all

        chain.doFilter(request, response); // TODO check if really necessary
    }

}
