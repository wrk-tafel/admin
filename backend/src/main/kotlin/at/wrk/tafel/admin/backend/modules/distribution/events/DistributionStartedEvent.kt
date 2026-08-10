package at.wrk.tafel.admin.backend.modules.distribution.events

/**
 * Published once a newly started distribution has been committed (see
 * `DistributionService.createNewDistribution`). Carries only the id so listeners re-fetch the
 * entity in their own persistence context, same reasoning as [DistributionClosedEvent].
 */
data class DistributionStartedEvent(
    val distributionId: Long,
)
