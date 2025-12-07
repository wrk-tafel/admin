package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.LoginResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
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
import tools.jackson.databind.json.JsonMapper
import java.nio.charset.Charset

@ExcludeFromTestCoverage
class TafelLoginFilter(
    authenticationManager: AuthenticationManager,
    private val jwtTokenService: JwtTokenService,
    private val applicationProperties: ApplicationProperties,
    private val jsonMapper: JsonMapper
) : UsernamePasswordAuthenticationFilter(authenticationManager) {

    companion object {
        private val basicAuthConverter = BasicAuthenticationConverter()
        const val jwtCookieName = "tafel-admin-jwt"

        fun createTokenCookie(token: String?, maxAge: Int, request: HttpServletRequest): Cookie {
            val cookie = Cookie(jwtCookieName, token)
            cookie.isHttpOnly = true
            cookie.secure = request.isSecure
            cookie.maxAge = maxAge
            cookie.path = "/"
            cookie.setAttribute("SameSite", "strict")
            return cookie
        }
    }

    init {
        this.setFilterProcessesUrl("/api/login")
    }

    public override fun obtainUsername(request: HttpServletRequest): String {
        return basicAuthConverter.convert(request)?.name as String
    }

    public override fun obtainPassword(request: HttpServletRequest): String {
        return basicAuthConverter.convert(request)?.credentials as String
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

            logger.info("Login successful via user '${user.username}' on '${request.requestURL}' (password-change required: ${user.passwordChangeRequired})")

            val cookie = createTokenCookie(token, expirationTimeInSeconds, request)
            response.addCookie(cookie)

            val responseBody = LoginResponse(passwordChangeRequired = user.passwordChangeRequired)

            response.contentType = MimeTypeUtils.APPLICATION_JSON_VALUE
            val responseString = jsonMapper.writeValueAsString(responseBody)

            IOUtils.write(responseString, response.outputStream, Charset.defaultCharset())
        }
    }

    override fun unsuccessfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        failed: AuthenticationException
    ) {
        response.status = HttpStatus.FORBIDDEN.value()
        logger.info("Login failed - ${failed.message}")
    }

}
