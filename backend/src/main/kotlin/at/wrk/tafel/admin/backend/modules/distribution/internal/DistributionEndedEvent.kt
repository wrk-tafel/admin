package at.wrk.tafel.admin.backend.modules.distribution.internal

/**
 * Published by [DistributionService.closeDistribution] right after `endedAt` commits, triggering
 * [DistributionEndedEventListener] to (re)compute the statistic
 * ([at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService])
 * and add missing cost contributions
 * ([at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.MissingCostContributionService]).
 * Purely internal to this module - unlike
 * [at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent] (published afterwards for
 * `reporting`), nothing outside `distribution` needs to react to this one.
 */
data class DistributionEndedEvent(
    val distributionId: Long,
)
