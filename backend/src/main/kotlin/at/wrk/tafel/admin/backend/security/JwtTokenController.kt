package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.User
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import javax.servlet.http.HttpServletRequest

@RestController
class JwtTokenController(
    private val jwtTokenService: JwtTokenService
) {
    private val logger = LoggerFactory.getLogger(JwtTokenController::class.java)

    @PostMapping("/api/token")
    fun generateToken(request: HttpServletRequest): ResponseEntity<JwtResponse> {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth?.principal is User) {

            val user = auth.principal as User
            val token: String? = user.username.let { jwtTokenService.generateToken(it, user.authorities) }

            token.let {
                logger.info("Login successful via user '${user.username}' from IP ${getIpAddress(request)} on ${request.requestURL}")

                return ResponseEntity.ok(JwtResponse(token!!))
            }
        }

        val username = request.getParameter("username")
        logger.info("Login failed via user '$username' from IP ${getIpAddress(request)} on ${request.requestURL}")
        return ResponseEntity.status(HttpStatus.FORBIDDEN.value()).build()
    }

    private fun getIpAddress(request: HttpServletRequest): String {
        var ipAddress = request.getHeader("X-Real-IP")
        if (ipAddress == null) {
            ipAddress = request.remoteAddr
        }
        return ipAddress
    }
}
