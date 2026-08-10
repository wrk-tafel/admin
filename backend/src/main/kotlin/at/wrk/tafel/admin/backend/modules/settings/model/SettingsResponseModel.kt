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
    val addresses: List<String>,
)

@ExcludeFromTestCoverage
enum class MailRecipientType {
    TO,
    CC,
    BCC,
}
