package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.web.authentication.AuthenticationConverter
import org.springframework.security.web.authentication.AuthenticationFilter

class TafelJwtAuthFilter(
    authenticationManager: AuthenticationManager,
    authenticationConverter: AuthenticationConverter
) : AuthenticationFilter(authenticationManager, authenticationConverter) {

    public override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return !request.requestURI.startsWith("/api")
    }

}
