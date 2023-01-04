package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.JwtAuthenticationResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.config.ApplicationProperties
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.apache.commons.io.IOUtils
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.authentication.www.BasicAuthenticationConverter
import java.nio.charset.Charset

@ExcludeFromTestCoverage
class TafelLoginFilter(
    authenticationManager: AuthenticationManager,
    private val jwtTokenService: JwtTokenService,
    private val applicationProperties: ApplicationProperties,
    private val objectMapper: ObjectMapper
) : UsernamePasswordAuthenticationFilter(authenticationManager) {

    companion object {
        private val basicAuthConverter: BasicAuthenticationConverter = BasicAuthenticationConverter()
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

            val authenticationResponse = if (user.passwordChangeRequired) {
                generateChangePasswordResponse(user, request)
            } else {
                generateAuthenticatedResponse(user, request)
            }

            val responseString = objectMapper.writeValueAsString(authenticationResponse)
            IOUtils.write(responseString, response.outputStream, Charset.defaultCharset())
        }
    }

    override fun unsuccessfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        failed: AuthenticationException
    ) {
        response.status = HttpStatus.FORBIDDEN.value()
        logger.info("Login failed - ${failed.message} (from IP: ${getIpAddress(request)})")
    }

    private fun generateAuthenticatedResponse(
        user: TafelUser, request: HttpServletRequest
    ): JwtAuthenticationResponse {
        val token: String = jwtTokenService.generateToken(
            username = user.username,
            authorities = user.authorities,
            expirationSeconds = applicationProperties.security.jwtToken.expirationTimeInSeconds
        )

        logger.info("Login successful via user '${user.username}' from IP ${getIpAddress(request)} on ${request.requestURL} (password change required: ${user.passwordChangeRequired})")
        return JwtAuthenticationResponse(token = token, passwordChangeRequired = false)
    }

    private fun generateChangePasswordResponse(
        user: TafelUser, request: HttpServletRequest
    ): JwtAuthenticationResponse {
        val token: String = jwtTokenService.generateToken(
            username = user.username,
            authorities = emptyList(),
            expirationSeconds = applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds
        )

        logger.info("Login successful via user '${user.username}' from IP ${getIpAddress(request)} on ${request.requestURL} (passwordchange required: ${user.passwordChangeRequired}")
        return JwtAuthenticationResponse(token = token, passwordChangeRequired = true)
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
