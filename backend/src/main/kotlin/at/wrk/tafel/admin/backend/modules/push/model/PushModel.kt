package at.wrk.tafel.admin.backend.modules.push.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank

@ExcludeFromTestCoverage
data class PushSubscriptionRequest(
    @field:NotBlank
    val endpoint: String,
    @field:NotBlank
    val p256dhKey: String,
    @field:NotBlank
    val authKey: String,
)

@ExcludeFromTestCoverage
data class PushSubscriptionItem(
    val id: Long,
    val endpoint: String,
)

@ExcludeFromTestCoverage
data class PushSubscriptionListResponse(
    val items: List<PushSubscriptionItem>,
)

@ExcludeFromTestCoverage
data class PushPublicKeyResponse(
    val publicKey: String,
)
