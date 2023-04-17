package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
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
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        currentDistribution?.let {
            return distributionCustomerRepository.countAllByDistributionId(it.id!!)
        }
        return null
    }

}
