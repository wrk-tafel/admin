package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank

@ExcludeFromTestCoverage
data class MailRecipientsRequest(
    val mailRecipients: List<@Valid MailRecipientsPerMailType>,
)

@ExcludeFromTestCoverage
data class MailRecipientsResponse(
    val mailRecipients: List<MailRecipientsPerMailType>,
)

@ExcludeFromTestCoverage
data class MailRecipientsPerMailType(
    @field:NotBlank
    val mailType: String,
    val recipients: List<@Valid MailRecipientAdresses>,
)

@ExcludeFromTestCoverage
data class MailRecipientAdresses(
    val recipientType: MailRecipientType,
    val addresses: List<@Valid MailRecipientAddressItem>,
)

// address is filtered/trimmed rather than @NotBlank-validated in SettingsService.updateMailRecipients -
// a blank entry (e.g. a freshly added, not-yet-filled-in row) is silently dropped, not rejected.
@ExcludeFromTestCoverage
data class MailRecipientAddressItem(
    val id: Long? = null,
    val address: String,
)

@ExcludeFromTestCoverage
enum class MailRecipientType {
    TO,
    CC,
    BCC,
}
