package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.MfaService
import at.wrk.tafel.admin.backend.common.auth.components.PasskeyEnableResult
import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginFilter
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.MfaCodeRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaDisableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaEnableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaPasskeyEnableRequest
import at.wrk.tafel.admin.backend.common.auth.model.MfaPasskeyItem
import at.wrk.tafel.admin.backend.common.auth.model.MfaPasskeyOptionsResponse
import at.wrk.tafel.admin.backend.common.auth.model.MfaPasskeyVerifyRequest
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
import org.springframework.web.bind.annotation.PathVariable
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
 * - one that **owes its code** may [verify] it, have the e-mailed one sent ([sendLoginCode]), or use a passkey
 *   instead ([passkeyLoginOptions]/[verifyPasskey]);
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
            emailAddress = status.emailAddress,
            passkeyAvailable = status.passkeyAvailable,
            passkeys = status.passkeys.map { MfaPasskeyItem(id = it.id, name = it.name, createdAt = it.createdAt, lastUsedAt = it.lastUsedAt) },
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
     * count as unfinished. A user who already has a method has to give a code of it as well (`currentCode`): the
     * session they are on may have been left open, and adding a second factor is as good as taking over the first.
     */
    @PostMapping("/enable")
    fun enable(
        @Valid @RequestBody request: MfaEnableRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.enable(authentication.username!!, request.code, request.currentCode)) {
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
        @Valid @RequestBody request: MfaEnableRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.enableEmail(authentication.username!!, request.code, request.currentCode)) {
            throw invalidCode()
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
    }

    /**
     * Sends the e-mailed code for a login that owes one - or, from a completed session, for switching a method
     * off or on, or changing the address on the account. Answered with `429` inside the cooldown, see `MfaEmailCodeService`.
     */
    @PostMapping("/email/send")
    fun sendLoginCode(): ResponseEntity<Unit> {
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        mfaService.sendLoginCode(authentication.username!!)
        return ResponseEntity.accepted().build()
    }

    // ---- passkeys

    /** Hands out the options the browser creates a passkey from; nothing counts until [enablePasskey]. */
    @PostMapping("/passkey/setup")
    fun setupPasskey(): MfaPasskeyOptionsResponse {
        val authentication = requireNoCodeOwed()
        return MfaPasskeyOptionsResponse(options = mfaService.startPasskeySetup(authentication.username!!))
    }

    /** Adds the passkey the browser created. The session stays what it is - it has passed a second factor already. */
    @PostMapping("/passkey/enable")
    fun enablePasskey(@Valid @RequestBody request: MfaPasskeyEnableRequest): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        when (mfaService.enablePasskey(authentication.username!!, request.credential.toString(), request.name, request.currentCode)) {
            PasskeyEnableResult.ENABLED -> Unit
            PasskeyEnableResult.CODE_REFUSED -> throw invalidCode()
            PasskeyEnableResult.PASSKEY_REFUSED -> throw BusinessRuleException("Der Passkey konnte nicht eingerichtet werden - bitte erneut versuchen!")
        }
        return ResponseEntity.noContent().build()
    }

    /** Removes one passkey. A `POST` rather than a `DELETE` because it takes the code in its body, like [disable]. */
    @PostMapping("/passkey/{passkeyId}/disable")
    fun disablePasskey(@PathVariable passkeyId: Long, @Valid @RequestBody request: MfaCodeRequest): ResponseEntity<Unit> {
        val authentication = requireNoCodeOwed()
        if (!mfaService.removePasskey(authentication.username!!, passkeyId, request.code)) {
            throw invalidCode()
        }
        return ResponseEntity.noContent().build()
    }

    /** Hands out the options a login that owes its second step asks one of the user's passkeys with. */
    @PostMapping("/passkey/login-options")
    fun passkeyLoginOptions(): MfaPasskeyOptionsResponse {
        val authentication = requireCodeOwed()
        return MfaPasskeyOptionsResponse(options = mfaService.startPasskeyLogin(authentication.username!!))
    }

    /** Finishes a login with a passkey instead of a code - otherwise exactly [verify]. */
    @PostMapping("/passkey/verify")
    fun verifyPasskey(
        @Valid @RequestBody request: MfaPasskeyVerifyRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): ResponseEntity<Unit> {
        val authentication = requireCodeOwed()
        if (!mfaService.verifyLoginWithPasskey(authentication.username!!, request.credential.toString())) {
            throw BusinessRuleException("Der Passkey wurde nicht akzeptiert, oder es gab zu viele Fehlversuche - bitte den Code verwenden!")
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
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
        val authentication = requireCodeOwed()
        if (!mfaService.verifyLogin(authentication.username!!, request.code)) {
            throw invalidCode()
        }
        issueCompletedSession(authentication.username, httpRequest, httpResponse)
        return ResponseEntity.noContent().build()
    }

    private fun requireCodeOwed(): TafelJwtAuthentication {
        val authentication = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        if (!authentication.mfaPending) {
            throw BusinessRuleException("Es ist keine Bestätigung mit einem Code erforderlich!")
        }
        return authentication
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
