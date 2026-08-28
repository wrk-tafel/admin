package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published by [MailOutboxService] when a mail is given up on - every retry spent, the row parked as
 * [MailOutboxStatus.FAILED]. It is the only moment at which a mail's failure is final, and the only
 * one anybody can act on.
 *
 * It exists because the outbox moved delivery out of the request that asked for it: the caller is
 * long gone by the time the last attempt fails, so a failure that is only a log line and a row is a
 * failure nobody sees. The recipients are external addresses, so nobody inside the application
 * notices the mail is missing either, and the people waiting for it cannot tell "not sent" from
 * "not sent yet".
 *
 * [id] and [mailType] rather than the mail's subject: the subject of a support request is the
 * reporter's own title, which may hold a customer's name (see G3 in the GDPR compliance doc), and
 * the only consumer of this event renders it on administrators' lock screens. The subject stays one
 * click away in the outbox row for whoever follows up.
 */
@ExcludeFromTestCoverage
data class MailDeliveryFailedEvent(
    val id: Long,
    val mailType: String?,
    val recipients: String,
    val lastError: String?,
)
