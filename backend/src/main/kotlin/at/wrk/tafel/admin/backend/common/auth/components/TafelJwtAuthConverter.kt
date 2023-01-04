package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationConverter

class TafelJwtAuthConverter(
    private val jwtTokenService: JwtTokenService
) : AuthenticationConverter {

    companion object {
        private const val headerPrefix = "Bearer"
    }

    override fun convert(request: HttpServletRequest): Authentication? {
        val header = request.getHeader("Authorization")
            ?.takeIf { it.startsWith(headerPrefix) }
            ?.trim()

        if (header != null) {
            
        }

        return null
    }

}
