package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthenticationToken
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpHeaders
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationConverter

class TafelJwtAuthConverter : AuthenticationConverter {

    companion object {
        private const val headerPrefix = "Bearer"
    }

    override fun convert(request: HttpServletRequest): Authentication? {
        val tokenString = request.getHeader(HttpHeaders.AUTHORIZATION)
            ?.takeIf { it.startsWith(headerPrefix) }
            ?.removePrefix(headerPrefix)
            ?.trim()

        if (tokenString?.isNotBlank() == true) {
            return TafelJwtAuthenticationToken(tokenString)
        }

        return null
    }

}
