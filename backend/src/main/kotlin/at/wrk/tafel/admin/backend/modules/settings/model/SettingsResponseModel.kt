package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxStatus
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.LocalDateTime

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

@ExcludeFromTestCoverage
data class MailStatusListResponse(
    val mailStatus: List<MailStatusItem>,
)

/**
 * How the last mail of one type ended, so the screen that maintains its recipients can also answer
 * whether anything actually reached them.
 *
 * Every mail type is reported, including the ones nothing was ever queued for - a type with no mail
 * behind it is exactly what an admin is looking at when the report they expected never arrived.
 * Such a type has a `status` of `null` and no timestamps.
 */
@ExcludeFromTestCoverage
data class MailStatusItem(
    val mailType: String,
    val status: MailOutboxStatus?,
    val queuedAt: LocalDateTime?,
    val sentAt: LocalDateTime?,
    val lastError: String?,
)
