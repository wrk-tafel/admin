package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class MailRecipients(
    val mailRecipients: List<MailRecipientsPerMailType>,
)

@ExcludeFromTestCoverage
data class MailRecipientsPerMailType(
    val mailType: String,
    val recipients: List<MailRecipientAdresses>,
)

@ExcludeFromTestCoverage
data class MailRecipientAdresses(
    val recipientType: MailRecipientType,
    val addresses: List<String>,
)

@ExcludeFromTestCoverage
enum class MailRecipientType {
    TO, CC, BCC
}
