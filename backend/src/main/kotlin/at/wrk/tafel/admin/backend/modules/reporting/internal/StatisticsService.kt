package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetailData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsSettings
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class StatisticsService(
    private val distributionRepository: DistributionRepository,
    private val customerRepository: CustomerRepository,
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

    @Transactional
    fun getData(fromDate: LocalDate, toDate: LocalDate): StatisticsData {
        val from = fromDate.minusDays(1)

        val customersValid = customerRepository.findByValidUntilAfter(from)
        val customersValidCount = customersValid.size

        return StatisticsData(
            beneficiaries = StatisticsDetailData(
                labels = listOf("Jänner", "Februar", "März", "April", "Mai"),
                dataPoints = listOf(
                    customersValidCount,
                    customersValidCount + 10,
                    customersValidCount + 20,
                    0,
                    customersValidCount + 5
                )
            )
        )
    }

}
