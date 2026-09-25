package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** The two ways to complete a login with a second factor; a user can have either or both. */
enum class MfaMethod {
    /** A code from an authenticator app. */
    TOTP,

    /** A code sent to the address on the account. */
    EMAIL,
}

@ExcludeFromTestCoverage
data class MfaStatusResponse(
    val totpEnabled: Boolean,
    val emailEnabled: Boolean,
    /** Whether the deployment requires every user to have a second factor. */
    val required: Boolean,
    /** Whether the e-mail method can be offered at all - it needs a mail to be sent. */
    val emailAvailable: Boolean,
    /**
     * Where a code by e-mail goes - the address on the account, so the page can say so; null when none is on
     * record, which is when the page sends the user to the "Meine Daten" tab instead of offering the method.
     */
    val emailAddress: String? = null,
)

/**
 * What the setup screen needs to enrol an authenticator app: the secret for typing in by hand, and the
 * `otpauth://` address the QR code is drawn from (the browser draws it - the secret is not sent to
 * anything else).
 */
@ExcludeFromTestCoverage
data class MfaSetupResponse(
    val secret: String,
    val otpauthUri: String,
)

/** The 6-digit code an authenticator app shows, or the one that was sent by e-mail. */
@ExcludeFromTestCoverage
data class MfaCodeRequest(
    @field:NotBlank
    @field:Size(max = 16)
    val code: String,
)

/**
 * Switches a method on. [code] is the one that proves the new method works (from the app for the secret that was
 * just handed out, or the one that was mailed); [currentCode] is one of a method the user already has, which is
 * required exactly when they have one - a session left open cannot add its own second factor.
 */
@ExcludeFromTestCoverage
data class MfaEnableRequest(
    @field:NotBlank
    @field:Size(max = 16)
    val code: String,
    @field:Size(max = 16)
    val currentCode: String? = null,
)

/** Switches [method] off; [code] may come from either method the user has. */
@ExcludeFromTestCoverage
data class MfaDisableRequest(
    val method: MfaMethod,
    @field:NotBlank
    @field:Size(max = 16)
    val code: String,
)
