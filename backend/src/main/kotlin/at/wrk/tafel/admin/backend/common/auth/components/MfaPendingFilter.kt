package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import org.springframework.security.web.util.matcher.OrRequestMatcher
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Keeps a session whose second factor is outstanding (see ADR-0058) from doing anything but sort that out.
 * [TafelJwtAuthProvider] already gives such a session no permissions, which stops everything behind
 * `hasAuthority(...)` - but plenty of endpoints ask only `isAuthenticated()` (a user's own data export, changing
 * the password, ...), and knowing a password must not be enough to use those. Denying by default here, rather than
 * adding a check to each of them, is what keeps a new `isAuthenticated()` endpoint from quietly becoming a way
 * around the second factor.
 *
 * Two situations, each with the few calls it needs:
 * - **A code is owed** (the user has a method): to hand the code in, to have the e-mailed one sent, to ask who the
 *   session is (which is how the frontend learns a code is owed), and to log out.
 * - **A method has to be set up** (the deployment requires one and the user has none): to read the status, to set
 *   either method up, and again to ask who the session is and to log out.
 */
class MfaPendingFilter : OncePerRequestFilter() {

    private val allowedWhileACodeIsOwed = OrRequestMatcher(
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/verify"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/email/send"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/users/info"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/users/logout"),
    )

    private val allowedWhileASetupIsRequired = OrRequestMatcher(
        PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/mfa"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/setup"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/enable"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/email/setup"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/mfa/email/enable"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/users/info"),
        PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/users/logout"),
    )

    public override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        val authentication = SecurityContextHolder.getContext().authentication
        if (authentication is TafelJwtAuthentication && !isAllowed(authentication, request)) {
            logger.info("Refused ${request.method} on a session that still owes its second factor (user '${authentication.username}')")
            response.status = HttpStatus.FORBIDDEN.value()
            return
        }
        filterChain.doFilter(request, response)
    }

    private fun isAllowed(authentication: TafelJwtAuthentication, request: HttpServletRequest): Boolean = when {
        authentication.mfaPending -> allowedWhileACodeIsOwed.matches(request)
        authentication.mfaSetupRequired -> allowedWhileASetupIsRequired.matches(request)
        else -> true
    }
}
