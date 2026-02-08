package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsSettings
import org.springframework.stereotype.Service

@Service
class StatisticsService(
    private val distributionRepository: DistributionRepository
) {

    fun getSettings(): StatisticsSettings {
        val closedDistributions = distributionRepository.findAll()
            .filter { it.endedAt != null && it.startedAt != null }

        return StatisticsSettings(
            availableYears = closedDistributions
                .mapNotNull { it.startedAt?.year }
                .distinct()
                .sortedByDescending { it },
            distributions = closedDistributions.map {
                StatisticsDistribution(
                    startDate = it.startedAt!!,
                    endDate = it.endedAt!!
                )
            }
                .sortedByDescending { it.startDate }
        )
    }

}
