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
 * [subject] and [recipients] rather than the row's id, because the consumers of this are people, not
 * code: what a notification has to say is which mail did not arrive.
 */
@ExcludeFromTestCoverage
data class MailDeliveryFailedEvent(
    val subject: String,
    val recipients: String,
    val lastError: String?,
)
