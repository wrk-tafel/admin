package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardLogisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardStatisticsData
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository,
    private val routeRepository: RouteRepository
) {

    @Transactional(readOnly = true)
    fun getData(): DashboardData {
        val currentDistribution = distributionRepository.getCurrentDistribution()

        return DashboardData(
            registeredCustomers = currentDistribution?.let { getRegisteredCustomers(it) },
            statistics = currentDistribution?.let { getStatisticsData(it) },
            logistics = currentDistribution?.let { getLogisticsData(it) },
        )
    }

    private fun getRegisteredCustomers(currentDistribution: DistributionEntity?): Int? {
        currentDistribution?.let {
            return distributionCustomerRepository.countAllByDistributionId(it.id!!)
        }
        return null
    }

    private fun getStatisticsData(currentDistribution: DistributionEntity?): DashboardStatisticsData {
        return DashboardStatisticsData(
            employeeCount = currentDistribution?.employeeCount,
            personsInShelterCount = currentDistribution?.personsInShelterCount
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
