package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.servlet.DispatcherType
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.security.web.access.AccessDeniedHandlerImpl

/**
 * A REQUEST-dispatch denial is a real 403 delivered to a client and worth logging with enough
 * detail to diagnose (principal + the authorities actually resolved on that token). ASYNC
 * dispatches are already excluded from authorization in [WebSecurityConfig] (see the
 * `dispatcherTypeMatchers` comment there for why they'd otherwise be denied on every SSE stream
 * completion), so a denial reaching here with a committed response is unexpected - log it quietly
 * rather than delegating to [AccessDeniedHandlerImpl], which would only throw a second, "already
 * committed" exception on top of it.
 */
@ExcludeFromTestCoverage
class TafelAccessDeniedHandler : AccessDeniedHandler {

    companion object {
        private val logger = LoggerFactory.getLogger(TafelAccessDeniedHandler::class.java)
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

        if (request.dispatcherType == DispatcherType.ASYNC || response.isCommitted) {
            logger.debug(
                "Access denied on {} dispatch for '{}' {} {} - resolved authorities: [{}]",
                request.dispatcherType,
                principal,
                request.method,
                request.requestURI,
                authorities,
            )
            return
        }

        logger.warn(
            "Access denied for user '{}' on {} {} - resolved authorities: [{}]",
            principal,
            request.method,
            request.requestURI,
            authorities,
        )
        delegate.handle(request, response, accessDeniedException)
    }
}
