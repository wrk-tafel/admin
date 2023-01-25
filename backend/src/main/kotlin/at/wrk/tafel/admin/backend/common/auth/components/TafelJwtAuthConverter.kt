package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationConverter

class TafelJwtAuthConverter : AuthenticationConverter {

    override fun convert(request: HttpServletRequest): Authentication? {
        val authCookie = request.cookies?.toList()
            ?.firstOrNull { it.name.equals(TafelLoginFilter.jwtCookieName) && it.value.isNotBlank() }
            ?: throw AuthenticationCredentialsNotFoundException("Missing authentication credentials")

        return TafelJwtAuthentication(authCookie.value)
    }

}
