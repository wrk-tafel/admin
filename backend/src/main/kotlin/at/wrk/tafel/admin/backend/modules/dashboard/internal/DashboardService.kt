package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
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
    private val distributionCustomerRepository: DistributionCustomerRepository,
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
                notes = currentDistribution.notes
            )
        } ?: DashboardData(
            registeredCustomers = null,
            tickets = null,
            statistics = null,
            logistics = null,
            notes = null
        )
    }

    private fun getTicketsData(currentDistribution: DistributionEntity): DashboardTicketsData {
        val countProcessedTickets = currentDistribution.customers.count { it.processed == true }
        val countTotalTickets = currentDistribution.customers.size

        return DashboardTicketsData(
            countProcessedTickets = countProcessedTickets,
            countTotalTickets = countTotalTickets
        )
    }

    private fun getRegisteredCustomers(currentDistribution: DistributionEntity): Int {
        return distributionCustomerRepository.countAllByDistributionId(currentDistribution.id!!)
    }

    private fun getStatisticsData(currentDistribution: DistributionEntity?): DashboardStatisticsData {
        return DashboardStatisticsData(
            employeeCount = currentDistribution?.statistic?.employeeCount.takeIf { it != 0 },
            // TODO shelter names should be shelter ids to have a better match but in statistics it's duplicated to have a historic copy
            selectedShelterNames = currentDistribution?.statistic?.shelters?.mapNotNull { it.name } ?: emptyList()
        )
    }

    private fun getLogisticsData(currentDistribution: DistributionEntity): DashboardLogisticsData {
        return DashboardLogisticsData(
            foodCollectionsRecordedCount = currentDistribution.foodCollections.size,
            foodCollectionsTotalCount = routeRepository.findAll().size,
            foodAmountTotal = currentDistribution.foodCollections
                .flatMap { it.items ?: emptyList() }
                .map { it.calculateWeight() }
                .sumOf { it }
        )
    }

}
