package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import org.springframework.stereotype.Service

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository
) {

    fun getData(): DashboardData {
        val registeredCustomers = getRegisteredCustomers()
        return DashboardData(registeredCustomers = registeredCustomers)
    }

    private fun getRegisteredCustomers(): Int? {
        val currentDistribution = distributionRepository.getCurrentDistribution()
        currentDistribution?.let {
            return distributionCustomerRepository.countAllByDistributionId(it.id!!)
        }
        return null
    }

}
