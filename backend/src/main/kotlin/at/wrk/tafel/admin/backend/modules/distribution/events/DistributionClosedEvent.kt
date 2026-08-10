package at.wrk.tafel.admin.backend.modules.distribution.events

/**
 * Published once a distribution's statistic has been (re)computed and saved - either right after
 * close (see `DistributionEndedEventListener`) or on a manual mail resend (see
 * `DistributionService.sendMails`). Carries only the id so listeners re-fetch the entity in their
 * own persistence context, same reasoning as [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionEndedEventListener].
 */
data class DistributionClosedEvent(
    val distributionId: Long,
)
