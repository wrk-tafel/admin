package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.LoginResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.config.ApplicationProperties
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.apache.commons.io.IOUtils
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.authentication.www.BasicAuthenticationConverter
import org.springframework.util.MimeTypeUtils
import java.nio.charset.Charset

@ExcludeFromTestCoverage
class TafelLoginFilter(
    authenticationManager: AuthenticationManager,
    private val jwtTokenService: JwtTokenService,
    private val applicationProperties: ApplicationProperties,
    private val objectMapper: ObjectMapper
) : UsernamePasswordAuthenticationFilter(authenticationManager) {

    companion object {
        private val basicAuthConverter = BasicAuthenticationConverter()
        const val jwtCookieName = "jwt"
    }

    init {
        this.setFilterProcessesUrl("/api/login")
    }

    public override fun obtainUsername(request: HttpServletRequest): String {
        return basicAuthConverter.convert(request).name as String
    }

    public override fun obtainPassword(request: HttpServletRequest): String {
        return basicAuthConverter.convert(request).credentials as String
    }

    public override fun successfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
        authResult: Authentication
    ) {
        val principal = authResult.principal
        if (principal is TafelUser) {
            val user = authResult.principal as TafelUser
            val expirationTimeInSeconds =
                if (user.passwordChangeRequired) applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds
                else applicationProperties.security.jwtToken.expirationTimeInSeconds
            val authorities = if (user.passwordChangeRequired) emptyList() else user.authorities

            val token: String = jwtTokenService.generateToken(
                username = user.username,
                authorities = authorities,
                expirationSeconds = expirationTimeInSeconds
            )

            logger.info("Login successful via user '${user.username}' from IP ${getIpAddress(request)} on ${request.requestURL} (password change required: ${user.passwordChangeRequired})")

            response.addCookie(getTokenCookie(token, expirationTimeInSeconds, request))

            val responseBody = LoginResponse(
                username = user.username,
                permissions = authorities.map { it.authority },
                passwordChangeRequired = user.passwordChangeRequired
            )

            response.contentType = MimeTypeUtils.APPLICATION_JSON_VALUE
            val responseString = objectMapper.writeValueAsString(responseBody)

            IOUtils.write(responseString, response.outputStream, Charset.defaultCharset())
        }
    }

    private fun getTokenCookie(token: String, maxAge: Int, request: HttpServletRequest): Cookie {
        val cookie = Cookie(jwtCookieName, token)
        cookie.isHttpOnly = true
        cookie.secure = request.isSecure
        cookie.maxAge = maxAge
        cookie.setAttribute("SameSite", "strict")
        return cookie
    }

    override fun unsuccessfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        failed: AuthenticationException
    ) {
        response.status = HttpStatus.FORBIDDEN.value()
        logger.info("Login failed - ${failed.message} (from IP: ${getIpAddress(request)})")
    }

    // TODO find a different solution
    private fun getIpAddress(request: HttpServletRequest): String {
        var ipAddress = request.getHeader("X-Real-IP")
        if (ipAddress == null) {
            ipAddress = request.remoteAddr
        }
        return ipAddress
    }

}
