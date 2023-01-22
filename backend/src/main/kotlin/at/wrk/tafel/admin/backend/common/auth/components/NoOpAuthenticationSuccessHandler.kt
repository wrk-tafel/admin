package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.AuthenticationSuccessHandler

@ExcludeFromTestCoverage
class NoOpAuthenticationSuccessHandler : AuthenticationSuccessHandler {

    override fun onAuthenticationSuccess(
        request: HttpServletRequest?,
        response: HttpServletResponse?,
        authentication: Authentication?
    ) {
    }

}
