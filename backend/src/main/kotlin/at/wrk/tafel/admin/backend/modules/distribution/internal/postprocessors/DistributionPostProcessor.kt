package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity

/**
 * Contract for a side effect run after a distribution closes and its statistic is saved (see
 * [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionPostProcessorService]).
 * Every Spring bean implementing this interface is picked up automatically (injected as a
 * `List<DistributionPostProcessor>`) and run in an isolated try/catch - one processor throwing
 * does not prevent the others from running. Implementations: [DailyReportMailPostProcessor],
 * [StatisticMailPostProcessor], [MissingCostContributionPostProcessor], [ReturnBoxesMailPostProcessor].
 */
fun interface DistributionPostProcessor {
    fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity)
}
