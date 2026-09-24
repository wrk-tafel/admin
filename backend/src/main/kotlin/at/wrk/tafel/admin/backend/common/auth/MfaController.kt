package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.MfaCodeRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaDisableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaSetupResponse
import at.wrk.tafel.admin.backend.common.auth.model.MfaStatusResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Two-factor authentication (see ADR-0058) - the caller's own account only. Everything is `isAuthenticated()` rather
 * than a permission: it is the user's own security setting, like the theme.
 *
 * Two kinds of unfinished session may call parts of this, and `MfaPendingFilter` lets exactly those calls through
 * and refuses the rest:
 * - one that **owes its code** may [verify] it and have the e-mailed one sent ([sendLoginCode]);
 * - one that **has to set a method up** because the deployment requires it may read the [getStatus] and use the
 *   setup and enable calls.
 * Everything that changes what is already set up ([disable]) refuses a session that owes its code
 * ([requireNoCodeOwed]), otherwise someone who only knows the password could switch the second factor off, or
 * replace it with their own.
 */
@RestController
@RequestMapping("/api/mfa")
@PreAuthorize("isAuthenticated()")
class MfaController(
    private val mfaService: MfaService,
    private val userDetailsManager: TafelUserDetailsManager,
    private val jwtTokenService: JwtTokenService,
    private val applicationProperties: ApplicationProperties,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    @GetMapping
    fun getStatus(): MfaStatusResponse {
        val authentication = requireNoCodeOwed()
        val status = mfaService.getStatus(authentication.username!!)
        return MfaStatusResponse(
            totpEnabled = status.totpEnabled,
            emailEnabled = status.emailEnabled,
            required = status.required,
            emailAvailable = status.emailAvailable,
        )
    }

    // ---- authenticator app

    /** Hands out a new secret; it does not count until [enable] has seen a valid code for it. */
    @PostMapping("/setup")
    fun setup(): MfaSetupResponse {
        val authentication = requireNoCodeOwed()
        val setup = mfaService.startSetup(authentication.username!!)
        return MfaSetupResponse(secret = setup.secret, otpauthUri = setup.otpauthUri)
    }

    /**
     * Switches the app on. The session this arrives on has by definition passed no second factor yet - it never
     * needed one, or it had none to give - so it is answered with one that has, or the very next request would
     * count as unfinished.
     */
    @PostMapping("/enable")
    fun enable(
        @Valid @RequestBody request: MfaCodeRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.enable(authentication.username!!, request.code)) {
            throw invalidCode()
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
    }

    // ---- e-mail

    /** Sends the code that proves the address works. */
    @PostMapping("/email/setup")
    fun setupEmail(): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        mfaService.startEmailSetup(authentication.username!!)
        return ResponseEntity.accepted().build()
    }

    /** Switches the e-mail method on with the code that was just sent - answered with a completed session, like [enable]. */
    @PostMapping("/email/enable")
    fun enableEmail(
        @Valid @RequestBody request: MfaCodeRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.enableEmail(authentication.username!!, request.code)) {
            throw invalidCode()
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
    }

    /**
     * Sends the e-mailed code for a login that owes one - or, from a completed session, for switching the method
     * off. Answered with `429` inside the cooldown, see `MfaEmailCodeService`.
     */
    @PostMapping("/email/send")
    fun sendLoginCode(): ResponseEntity<Unit> {
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        mfaService.sendLoginCode(authentication.username!!)
        return ResponseEntity.accepted().build()
    }

    // ---- switching off and logging in

    @PostMapping("/disable")
    fun disable(@Valid @RequestBody request: MfaDisableRequest): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.disable(authentication.username!!, request.method, request.code)) {
            throw invalidCode()
        }
        return ResponseEntity.noContent().build()
    }

    /**
     * Finishes a login that was waiting for its code by exchanging the password-only session for a full one. The
     * answer to a wrong code and to a locked-out account is the same, like at login itself.
     */
    @PostMapping("/verify")
    fun verify(
        @Valid @RequestBody request: MfaCodeRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (!authentication.mfaPending) {
            throw BusinessRuleException("Es ist keine Bestätigung mit einem Code erforderlich!")
        }
        if (!mfaService.verifyLogin(authentication.username!!, request.code)) {
            throw invalidCode()
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
    }

    private fun requireNoCodeOwed(): TafelJwtAuthentication {
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (authentication.mfaPending) {
            throw TafelApiException(HttpStatus.FORBIDDEN, "Bitte zuerst die Anmeldung mit dem Code aus der Authenticator-App abschließen!")
        }
        return authentication
    }

    private fun invalidCode() = BusinessRuleException("Der Code ist ungültig, oder es gab zu viele Fehlversuche - bitte später erneut versuchen!")

    private fun issueCompletedSession(username: String, request: HttpServletRequest, response: HttpServletResponse) {
        val jwtProperties = applicationProperties.security.jwtToken
        // An account that still has to change its password stays on the short-lived token, exactly as
        // it is after the login itself - it has no permissions until it did.
        val expirationSeconds = if (userDetailsManager.loadUserByUsername(username).passwordChangeRequired) {
            jwtProperties.expirationTimePwdChangeInSeconds
        } else {
            jwtProperties.expirationTimeInSeconds
        }
        val token = jwtTokenService.generateToken(username = username, expirationSeconds = expirationSeconds, mfaVerified = true)
        response.addCookie(TafelLoginFilter.createTokenCookie(token, expirationSeconds, tafelAdminProperties.server.relativeBaseUrl, request))
    }
}
