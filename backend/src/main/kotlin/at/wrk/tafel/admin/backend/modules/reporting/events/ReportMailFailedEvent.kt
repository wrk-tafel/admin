package at.wrk.tafel.admin.backend.modules.reporting.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published by `reporting` when one of the after-close report mails could not be sent, even after
 * retrying, so that other modules (currently `push`) can raise it with someone instead of it being
 * visible only in the application log. Published per failed mail: the three are attempted
 * independently of each other, and which one didn't arrive is the whole content of the message.
 *
 * [reportName] is the German name of the report as people know it from the mail itself ("Tagesreport",
 * "Statistiken", "Retourkisten") rather than a [at.wrk.tafel.admin.backend.database.model.base.MailType],
 * so that consumers can quote it without needing to translate this module's mail types.
 */
@ExcludeFromTestCoverage
data class ReportMailFailedEvent(
    val distributionId: Long,
    val reportName: String,
)
