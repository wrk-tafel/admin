package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity

fun interface DistributionPostProcessor {
    fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity)
}
