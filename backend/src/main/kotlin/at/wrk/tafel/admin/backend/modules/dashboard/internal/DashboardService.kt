package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardLogisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardStatisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardTicketsData
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val routeRepository: RouteRepository,
) {

    @Transactional(readOnly = true)
    fun getData(): DashboardData {
        val currentDistribution = distributionRepository.getCurrentDistribution()

        return currentDistribution?.let {
            DashboardData(
                registeredCustomers = getRegisteredCustomers(currentDistribution),
                tickets = getTicketsData(currentDistribution),
                statistics = getStatisticsData(currentDistribution),
                logistics = getLogisticsData(currentDistribution),
                notes = currentDistribution.notes,
            )
        } ?: DashboardData(
            registeredCustomers = null,
            tickets = null,
            statistics = null,
            logistics = null,
            notes = null,
        )
    }

    private fun getTicketsData(currentDistribution: DistributionEntity): DashboardTicketsData {
        val countProcessedTickets = currentDistribution.households.count { it.processed == true }
        val countTotalTickets = currentDistribution.households.size

        return DashboardTicketsData(
            countProcessedTickets = countProcessedTickets,
            countTotalTickets = countTotalTickets,
        )
    }

    private fun getRegisteredCustomers(currentDistribution: DistributionEntity): Int = distributionHouseholdRepository.countAllByDistributionId(currentDistribution.id!!)

    private fun getStatisticsData(currentDistribution: DistributionEntity?): DashboardStatisticsData = DashboardStatisticsData(
        employeeCount = currentDistribution?.statistic?.employeeCount.takeIf { it != 0 },
        // Intentionally names, not shelter ids: statistics keep a historic copy independent of later shelter renames/deletions
        selectedShelterNames = currentDistribution?.statistic?.shelters
            ?.sortedWith(compareBy({ it.sortOrder ?: 0 }, { it.name }))
            ?.mapNotNull { it.name } ?: emptyList(),
    )

    private fun getLogisticsData(currentDistribution: DistributionEntity): DashboardLogisticsData = DashboardLogisticsData(
        foodCollectionsRecordedCount = currentDistribution.foodCollections.size,
        foodCollectionsTotalCount = routeRepository.findAll().size,
        foodAmountTotal = currentDistribution.foodCollections
            .flatMap { it.items ?: emptyList() }
            .map { it.calculateWeight() }
            .sumOf { it },
    )
}
