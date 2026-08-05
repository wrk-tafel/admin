package at.wrk.tafel.admin.backend.common.auth.components

import jakarta.servlet.DispatcherType
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.security.web.access.AccessDeniedHandlerImpl
import org.springframework.security.web.csrf.CsrfException

/**
 * Handles the denials raised inside the *filter chain* - method-security (`@PreAuthorize`) denials
 * never reach here, they're answered by `GenericExceptionHandler.handleAccessDeniedException`.
 *
 * A REQUEST-dispatch denial is a real 403 delivered to a client and worth logging with enough
 * detail to diagnose. ASYNC dispatches are already excluded from authorization in [WebSecurityConfig]
 * (see the `dispatcherTypeMatchers` comment there for why they'd otherwise be denied on every SSE
 * stream completion), so a denial reaching here with a committed response is unexpected - log it
 * quietly rather than delegating to [AccessDeniedHandlerImpl], which would only throw a second,
 * "already committed" exception on top of it.
 *
 * **Why the denial's cause is logged, not just the principal:** by far the most common denial here
 * is a [CsrfException] (missing/stale `X-XSRF-TOKEN` header), and `CsrfFilter` runs *before*
 * `TafelJwtAuthenticationFilter` - so the security context is still empty and the principal reads
 * `anonymous`/`none` even for a fully authenticated user with every authority they need. Logging
 * only the principal therefore describes a CSRF failure as if it were an authorization failure,
 * which is exactly what left the production 403s in issue #2989 unexplained: they looked like a
 * session that had "lost" its LOGISTICS authority. The exception type plus the CSRF header/cookie
 * state tell the two apart at a glance.
 */
class TafelAccessDeniedHandler : AccessDeniedHandler {

    companion object {
        private val logger = LoggerFactory.getLogger(TafelAccessDeniedHandler::class.java)
        private const val CSRF_HEADER_NAME = "X-XSRF-TOKEN"
        private const val CSRF_COOKIE_NAME = "XSRF-TOKEN"
    }

    private val delegate = AccessDeniedHandlerImpl()

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        val authentication = SecurityContextHolder.getContext().authentication
        val principal = authentication?.name ?: "anonymous"
        val authorities = authentication?.authorities?.joinToString(", ") { it.authority ?: "?" } ?: "none"
        val cause = describeCause(request, accessDeniedException)

        if (request.dispatcherType == DispatcherType.ASYNC || response.isCommitted) {
            logger.debug(
                "Access denied on {} dispatch for '{}' {} {} - resolved authorities: [{}] - {}",
                request.dispatcherType,
                principal,
                request.method,
                request.requestURI,
                authorities,
                cause,
            )
            return
        }

        logger.warn(
            "Access denied for user '{}' on {} {} - resolved authorities: [{}] - {}",
            principal,
            request.method,
            request.requestURI,
            authorities,
            cause,
        )
        delegate.handle(request, response, accessDeniedException)
    }

    private fun describeCause(request: HttpServletRequest, exception: AccessDeniedException): String {
        val type = exception.javaClass.simpleName
        if (exception !is CsrfException) {
            return "$type: ${exception.message}"
        }

        val headerPresent = !request.getHeader(CSRF_HEADER_NAME).isNullOrBlank()
        val cookiePresent = request.cookies?.any { it.name == CSRF_COOKIE_NAME && !it.value.isNullOrBlank() } == true
        return "$type (CSRF, not an authorization failure - principal/authorities above are empty " +
            "because CsrfFilter runs before authentication): $CSRF_HEADER_NAME header " +
            "${presence(headerPresent)}, $CSRF_COOKIE_NAME cookie ${presence(cookiePresent)}"
    }

    private fun presence(present: Boolean) = if (present) "present" else "missing"
}
