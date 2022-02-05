package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.rest.TafelRestController
import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.User
import org.springframework.web.bind.annotation.PostMapping
import javax.servlet.http.HttpServletRequest

@TafelRestController
class JwtLoginController(
    private val jwtTokenService: JwtTokenService
) {
    private val logger = LoggerFactory.getLogger(JwtLoginController::class.java)

    @PostMapping("/token")
    fun generateToken(request: HttpServletRequest): ResponseEntity<JwtResponse> {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth?.principal != null && auth?.principal is User) {

            val user = auth.principal as User
            val token: String? = user.username.let { jwtTokenService.generateToken(it, user.authorities) }

            token.let {
                var ipAddress = request.getHeader("X-FORWARDED-FOR")
                if (ipAddress == null) {
                    ipAddress = request.remoteAddr
                }
                logger.info("Login successful - User '${user.username}' from IP: $ipAddress")

                return ResponseEntity.ok(JwtResponse(token!!))
            }
        }

        var ipAddress = request.getHeader("X-FORWARDED-FOR")
        if (ipAddress == null) {
            ipAddress = request.remoteAddr
        }
        logger.info("Login failed from IP: $ipAddress")
        return ResponseEntity.status(HttpStatus.FORBIDDEN.value()).build()
    }

}
