package at.wrk.tafel.admin.backend.modules.push.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class PushSubscriptionRequest(
    @field:NotBlank
    val endpoint: String,
    @field:NotBlank
    val p256dhKey: String,
    @field:NotBlank
    val authKey: String,
    // Not validated as required - a missing/unparseable value just means the device list falls
    // back to a generic label, not a hard failure of the subscribe flow itself.
    val userAgent: String? = null,
)

@ExcludeFromTestCoverage
data class PushSubscriptionItem(
    val id: Long,
    val endpoint: String,
    val userAgent: String?,
    val label: String?,
    val createdAt: LocalDateTime,
)

@ExcludeFromTestCoverage
data class PushSubscriptionLabelRequest(
    // Null/blank clears the custom label, falling back to the auto-detected browser/OS one - not
    // @NotBlank, since clearing is a legitimate action, not a validation failure.
    @field:Size(max = 100)
    val label: String?,
)

@ExcludeFromTestCoverage
data class PushSubscriptionListResponse(
    val items: List<PushSubscriptionItem>,
)

@ExcludeFromTestCoverage
data class PushPublicKeyResponse(
    val publicKey: String,
)

/**
 * Outcome of a per-device test notification. Deliberately a 200 response with an explicit result
 * rather than an error status per failure: the whole point of the button is to tell the user
 * *which* of these happened, and the frontend needs to react differently to each (e.g. reloading
 * the device list after [EXPIRED] pruned it).
 */
@ExcludeFromTestCoverage
data class PushTestResponse(
    val result: PushTestResult,
)

@ExcludeFromTestCoverage
enum class PushTestResult {
    SENT,

    /** The push service no longer knows this subscription; it has been removed from the device list. */
    EXPIRED,

    /** No VAPID keypair configured on the server - nothing was sent, and no device can ever receive a push. */
    NOT_CONFIGURED,
    FAILED,
}

@ExcludeFromTestCoverage
data class PushPreferencesResponse(
    // Master switch: whether this user receives push notifications at all, on any of their
    // devices - overrides every per-type preference below when false.
    val masterEnabled: Boolean,
    val types: List<PushNotificationTypePreferenceItem>,
)

@ExcludeFromTestCoverage
data class PushNotificationTypePreferenceItem(
    val type: PushNotificationType,
    val enabled: Boolean,
)

/**
 * API-facing counterpart of [at.wrk.tafel.admin.backend.database.model.push.PushNotificationType] -
 * controllers must not depend on `database.model` types directly (see `ProjectSpecificRulesTest`),
 * so this mirrors it structurally; [at.wrk.tafel.admin.backend.modules.push.internal.PushPreferencesService]
 * converts between the two, same as `HouseholdDocumentModel.DocumentType` for household documents.
 */
@ExcludeFromTestCoverage
enum class PushNotificationType {
    DISTRIBUTION_STARTED,
    DISTRIBUTION_CLOSED,
}

@ExcludeFromTestCoverage
data class PushMasterPreferenceRequest(
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class PushTypePreferenceRequest(
    val enabled: Boolean,
)
