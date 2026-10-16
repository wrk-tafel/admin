package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import tools.jackson.databind.JsonNode
import java.time.LocalDateTime

/**
 * The two methods a user switches on and off as a whole. Passkeys are the third method but not listed here: a
 * user has any number of those, added and removed one by one.
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
    val passkeys: List<MfaPasskeyItem> = emptyList(),
)

/** One passkey as the "Mein Konto" page lists it. */
@ExcludeFromTestCoverage
data class MfaPasskeyItem(
    val id: Long,
    val name: String,
    val kind: PasskeyKind,
    val createdAt: LocalDateTime?,
    val lastUsedAt: LocalDateTime?,
)

/**
 * What kind of authenticator holds a passkey, as far as the transports it reported when it was added tell: one
 * built into a device (or a phone reached over `hybrid`), or a separate security key plugged in or held against
 * the device. Only shown to the owner, so they can tell their passkeys apart - nothing is decided by it.
 */
enum class PasskeyKind {
    DEVICE,
    SECURITY_KEY,

    /** The authenticator reported no transports (or only ones not listed here). */
    UNKNOWN,
    ;

    companion object {
        private val DEVICE_TRANSPORTS = setOf("internal", "hybrid")
        private val SECURITY_KEY_TRANSPORTS = setOf("usb", "nfc", "ble", "smart-card")

        /** [transports] as stored on the passkey: comma-separated, `null` when none were reported. */
        fun of(transports: String?): PasskeyKind {
            val reported = transports?.split(",")?.map { it.trim() }?.toSet() ?: emptySet()
            return when {
                reported.any { it in DEVICE_TRANSPORTS } -> DEVICE
                reported.any { it in SECURITY_KEY_TRANSPORTS } -> SECURITY_KEY
                else -> UNKNOWN
            }
        }
    }
}

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
 * the setup call and [name] what the user calls it. A user who already has a method proves one with it, like in
 * [MfaEnableRequest].
 */
@ExcludeFromTestCoverage
data class MfaPasskeyEnableRequest(
    val credential: JsonNode,
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 16)
    val currentCode: String? = null,
    val currentCredential: JsonNode? = null,
)

/**
 * Proof of a method the user has, for removing a passkey: [code] of a code method, or [credential] - the answer
 * of one of the user's passkeys to the options of `POST /api/mfa/passkey/options`.
 */
@ExcludeFromTestCoverage
data class MfaProofRequest(
    @field:Size(max = 16)
    val code: String? = null,
    val credential: JsonNode? = null,
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
 * just handed out, or the one that was mailed). A user who already has a method also proves one - a session left
 * open cannot add its own second factor: with [currentCode] of a code method, or with [currentCredential], the
 * answer of one of their passkeys to the options of `POST /api/mfa/passkey/options`.
 */
@ExcludeFromTestCoverage
data class MfaEnableRequest(
    @field:NotBlank
    @field:Size(max = 16)
    val code: String,
    @field:Size(max = 16)
    val currentCode: String? = null,
    val currentCredential: JsonNode? = null,
)

/** Switches [method] off, with proof of any method the user has: [code], or [credential] as in [MfaProofRequest]. */
@ExcludeFromTestCoverage
data class MfaDisableRequest(
    val method: MfaMethod,
    @field:Size(max = 16)
    val code: String? = null,
    val credential: JsonNode? = null,
)
