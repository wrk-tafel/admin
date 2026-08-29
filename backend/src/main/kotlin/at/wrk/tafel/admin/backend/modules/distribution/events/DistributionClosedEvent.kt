package at.wrk.tafel.admin.backend.modules.distribution.events

/**
 * Published once a distribution's statistic has been (re)computed and saved - either right after
 * close (see `DistributionEndedEventListener`) or on a manual mail resend (see
 * `DistributionService.sendMails`). Carries only the id so listeners re-fetch the entity in their
 * own persistence context, same reasoning as [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionEndedEventListener].
 *
 * [resend] is true only for the manual-resend publish. A listener that reacts to the distribution
 * actually *closing* (e.g. `push`'s `DistributionClosedPushListener`) must ignore an event with
 * `resend == true` - otherwise re-sending Monday's mails today re-broadcasts "the distribution has
 * ended" to every device.
 */
data class DistributionClosedEvent(
    val distributionId: Long,
    val resend: Boolean = false,
)
