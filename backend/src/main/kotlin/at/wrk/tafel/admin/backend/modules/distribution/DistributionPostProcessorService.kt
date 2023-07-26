package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.statistic.DistributionStatisticService
import org.springframework.stereotype.Service

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService
) {

    fun process(distribution: DistributionEntity) {
        distributionStatisticService.createAndSaveStatistic(distribution)
    }

}
