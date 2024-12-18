package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardStatisticsData
import org.springframework.stereotype.Service

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository
) {

    fun getData(): DashboardData {
        val currentDistribution = distributionRepository.getCurrentDistribution()

        return DashboardData(
            registeredCustomers = currentDistribution?.let { getRegisteredCustomers(it) },
            statistics = currentDistribution?.let { getStatisticsData(it) }
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

}
