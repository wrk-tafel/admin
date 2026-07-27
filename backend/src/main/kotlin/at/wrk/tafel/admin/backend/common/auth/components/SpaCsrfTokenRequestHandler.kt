package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.security.web.csrf.CsrfTokenRequestHandler
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler
import java.util.function.Supplier

/**
 * CSRF handling for a cookie-based SPA, following the recipe from the Spring Security reference:
 * BREACH protection (Xor handler) applies when the token is rendered server-side, while token
 * values sent by the SPA via the X-XSRF-TOKEN header are the raw cookie value and are resolved
 * with the plain handler.
 */
class SpaCsrfTokenRequestHandler : CsrfTokenRequestHandler {

    private val plain = CsrfTokenRequestAttributeHandler()
    private val xor = XorCsrfTokenRequestAttributeHandler()

    override fun handle(request: HttpServletRequest, response: HttpServletResponse, csrfToken: Supplier<CsrfToken>) {
        xor.handle(request, response, csrfToken)
        // materialize the deferred token so the XSRF-TOKEN cookie is written on every response
        // where it's missing - the SPA needs it before its first mutating request
        csrfToken.get()
    }

    override fun resolveCsrfTokenValue(request: HttpServletRequest, csrfToken: CsrfToken): String? {
        val headerValue = request.getHeader(csrfToken.headerName)
        return (if (!headerValue.isNullOrBlank()) plain else xor).resolveCsrfTokenValue(request, csrfToken)
    }
}
