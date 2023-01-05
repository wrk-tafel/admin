package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationConverter

class TafelJwtAuthConverter : AuthenticationConverter {

    companion object {
        private const val headerPrefix = "Bearer"
    }

    override fun convert(request: HttpServletRequest): Authentication? {
        val hasHeader = request.headerNames.toList()
            .any { it.equals(HttpHeaders.AUTHORIZATION, ignoreCase = true) }

        if (hasHeader) {
            val header = request.getHeader(HttpHeaders.AUTHORIZATION)

            if (header != null && !header.startsWith(headerPrefix)) {
                throw BadCredentialsException("Invalid token")
            }

            val tokenString = header.removePrefix(headerPrefix)?.trim()
            if (tokenString?.isNotBlank() == true) {
                return TafelJwtAuthentication(tokenString)
            }
        }

        throw AuthenticationCredentialsNotFoundException("Missing ${HttpHeaders.AUTHORIZATION} header")
    }

}
