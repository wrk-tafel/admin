package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import tools.jackson.databind.JsonNode
import java.time.LocalDateTime

/**
 * The two methods a user switches on and off as a whole; a user can have either or both. Passkeys are not one
 * of them: a user has any number of those, added and removed one by one, and only next to one of these.
 */
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
    /** Whether passkeys can be offered at all - the deployment has to name the site they belong to. */
    val passkeyAvailable: Boolean = false,
    val passkeys: List<MfaPasskeyItem> = emptyList(),
)

/** One passkey as the "Mein Konto" page lists it. */
@ExcludeFromTestCoverage
data class MfaPasskeyItem(
    val id: Long,
    val name: String,
    val createdAt: LocalDateTime?,
    val lastUsedAt: LocalDateTime?,
)

/**
 * What the browser needs for a passkey ceremony: the WebAuthn options in their JSON form, which the page hands
 * to `PublicKeyCredential.parseCreationOptionsFromJSON()` / `parseRequestOptionsFromJSON()` unchanged.
 */
@ExcludeFromTestCoverage
data class MfaPasskeyOptionsResponse(
    val options: Map<String, Any?>,
)

/**
 * Adds a passkey. [credential] is what the browser's `PublicKeyCredential.toJSON()` returned for the options of
 * the setup call, [name] what the user calls it, and [currentCode] a code of a method the user has - always
 * required, since a passkey is only ever added next to one (ADR-0070).
 */
@ExcludeFromTestCoverage
data class MfaPasskeyEnableRequest(
    val credential: JsonNode,
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:NotBlank
    @field:Size(max = 16)
    val currentCode: String,
)

/** Completes a login with a passkey: [credential] is the browser's `PublicKeyCredential.toJSON()` of the assertion. */
@ExcludeFromTestCoverage
data class MfaPasskeyVerifyRequest(
    val credential: JsonNode,
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
