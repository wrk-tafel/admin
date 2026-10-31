package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.LoginResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.apache.commons.io.IOUtils
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.AuthenticationServiceException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.authentication.www.BasicAuthenticationConverter
import org.springframework.util.MimeTypeUtils
import tools.jackson.databind.json.JsonMapper
import java.nio.charset.Charset

class TafelLoginFilter(
    authenticationManager: AuthenticationManager,
    private val userSessionService: UserSessionService,
    private val jsonMapper: JsonMapper,
    private val mfaEmailCodeService: MfaEmailCodeService,
) : UsernamePasswordAuthenticationFilter(authenticationManager) {

    companion object {
        private val basicAuthConverter = BasicAuthenticationConverter()
    }

    init {
        this.setFilterProcessesUrl("/api/login")
    }

    public override fun obtainUsername(request: HttpServletRequest): String = basicAuthConverter.convert(request)?.name
        ?: throw BadCredentialsException("Missing or invalid 'Authorization: Basic' header")

    public override fun obtainPassword(request: HttpServletRequest): String = basicAuthConverter.convert(request)?.credentials as? String
        ?: throw BadCredentialsException("Missing or invalid 'Authorization: Basic' header")

    /**
     * A [PasswordHashingBusyException] is no [AuthenticationException], so it would pass the filter's
     * own failure handling and end as a `500` from the servlet container. Wrapped, it reaches
     * [unsuccessfulAuthentication], which answers it with `503` and `Retry-After` - and, since it is
     * no [BadCredentialsException], it does not count as a failed attempt (`TafelLoginProvider`).
     */
    public override fun attemptAuthentication(request: HttpServletRequest, response: HttpServletResponse): Authentication = try {
        super.attemptAuthentication(request, response)
    } catch (e: PasswordHashingBusyException) {
        throw LoginBusyException(e)
    }

    /**
     * Opens the login session (see [UserSessionService.startSession]). When [TafelUser.passwordChangeRequired]
     * is true, or a second factor is still owed, it is a short-lived one. The session itself carries no
     * permissions - [TafelSessionAuthProvider] grants none while either is outstanding, which is what
     * actually gates access before the change-password or code flow completes.
     */
    public override fun successfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
        authResult: Authentication,
    ) {
        val principal = authResult.principal
        if (principal is TafelUser) {
            val user = authResult.principal as TafelUser

            // An e-mailed code belongs to the login it was sent for: one left over from an earlier login that
            // was never finished must not complete this one. The login page asks for a fresh one.
            if (user.mfaEmailEnabled) {
                mfaEmailCodeService.discard(user.id!!)
            }

            userSessionService.startSession(request, user.username, pending = user.passwordChangeRequired || user.mfaEnabled)

            logger.info(
                "Login successful via user '${sanitizeForLog(user.username)}' on '${request.requestURL}' " +
                    "(password-change required: ${user.passwordChangeRequired}, second factor required: ${user.mfaEnabled})",
            )

            val responseBody = LoginResponse(passwordChangeRequired = user.passwordChangeRequired, mfaRequired = user.mfaEnabled, mfaMethods = user.mfaMethods)

            response.contentType = MimeTypeUtils.APPLICATION_JSON_VALUE
            val responseString = jsonMapper.writeValueAsString(responseBody)

            IOUtils.write(responseString, response.outputStream, Charset.defaultCharset())
        }
    }

    public override fun unsuccessfulAuthentication(
        request: HttpServletRequest,
        response: HttpServletResponse,
        failed: AuthenticationException,
    ) {
        if (failed is LoginBusyException) {
            response.status = HttpStatus.SERVICE_UNAVAILABLE.value()
            response.setHeader(HttpHeaders.RETRY_AFTER, failed.cause.retryAfterInSeconds.toString())
            logger.warn("Login not attempted - ${failed.message}")
            return
        }

        // Deliberately the same status for a locked-out account/IP (LockedException) as for wrong
        // credentials: distinguishing them here would tell a caller which usernames/IPs are already
        // locked out, before they've even proven who they are.
        response.status = HttpStatus.FORBIDDEN.value()
        logger.info("Login failed - ${failed.message}")
    }
}

/**
 * A login that got no password hashing slot in time ([PasswordHashingBusyException]), as the
 * [AuthenticationException] [TafelLoginFilter.unsuccessfulAuthentication] needs to see it.
 */
class LoginBusyException(
    override val cause: PasswordHashingBusyException,
) : AuthenticationServiceException(cause.message, cause)
