package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.security.components.JwtTokenService
import at.wrk.tafel.admin.backend.security.model.JwtResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.User
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class JwtLoginController(
    private val jwtTokenService: JwtTokenService
) {

    @PostMapping("/token")
    fun generateToken(): ResponseEntity<JwtResponse> {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth?.principal != null) {

            val user = auth.principal as User
            val token: String? = user.username.let { jwtTokenService.generateToken(it, user.authorities) }
            token.let { return ResponseEntity.ok(JwtResponse(token!!)) }

            return ResponseEntity.ok(JwtResponse(token!!))
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN.value()).build()
    }

}
