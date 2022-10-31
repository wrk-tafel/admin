package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtAuthenticationResponse
import at.wrk.tafel.admin.backend.security.model.TafelUser
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import javax.servlet.http.HttpServletRequest

@RestController
class JwtTokenController(
    private val jwtTokenService: JwtTokenService,
    private val applicationProperties: ApplicationProperties
) {
    private val logger = LoggerFactory.getLogger(JwtTokenController::class.java)

    @PostMapping("/api/token")
    fun generateToken(request: HttpServletRequest): ResponseEntity<JwtAuthenticationResponse> {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth?.principal is TafelUser) {

            val user = auth.principal as TafelUser

            return if (user.passwordChangeRequired) {
                generateChangePasswordResponse(user, request)
            } else {
                generateAuthenticatedResponse(user, request)
            }
        }

        val username = request.getParameter("username")
        logger.info("Login failed via user '$username' from IP ${getIpAddress(request)} on ${request.requestURL}")
        return ResponseEntity.status(HttpStatus.FORBIDDEN.value()).build()
    }

    private fun generateAuthenticatedResponse(
        user: TafelUser,
        request: HttpServletRequest
    ): ResponseEntity<JwtAuthenticationResponse> {
        val token: String = jwtTokenService.generateToken(
            username = user.username,
            authorities = user.authorities,
            expirationSeconds = applicationProperties.security.jwtToken.expirationTimeInSeconds
        )

        logger.info(
            """
                Login successful via user '${user.username}'
                from IP ${getIpAddress(request)} on ${request.requestURL}
                (password change required: ${user.passwordChangeRequired}
            """.trimIndent()
        )

        return ResponseEntity.ok(
            JwtAuthenticationResponse(
                token = token,
                passwordChangeRequired = false
            )
        )
    }

    private fun generateChangePasswordResponse(
        user: TafelUser,
        request: HttpServletRequest
    ): ResponseEntity<JwtAuthenticationResponse> {
        val token: String = jwtTokenService.generateToken(
            username = user.username,
            authorities = emptyList(),
            expirationSeconds = applicationProperties.security.jwtToken.expirationTimePwdChangeInSeconds
        )

        logger.info(
            """
                Login successful via user '${user.username}'
                from IP ${getIpAddress(request)} on ${request.requestURL}
                (password change required: ${user.passwordChangeRequired}
            """.trimIndent()
        )

        return ResponseEntity.ok(
            JwtAuthenticationResponse(
                token = token,
                passwordChangeRequired = true
            )
        )
    }

    private fun getIpAddress(request: HttpServletRequest): String {
        var ipAddress = request.getHeader("X-Real-IP")
        if (ipAddress == null) {
            ipAddress = request.remoteAddr
        }
        return ipAddress
    }
}
