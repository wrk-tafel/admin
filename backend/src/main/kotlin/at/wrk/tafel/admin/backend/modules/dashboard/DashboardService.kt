package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import org.springframework.stereotype.Service

@Service
class DashboardService(
    private val distributionCustomerRepository: DistributionCustomerRepository
) {

    fun getData(): DashboardData {
        val registeredCustomers = getRegisteredCustomers()
        return DashboardData(registeredCustomers = registeredCustomers)
    }

    private fun getRegisteredCustomers(): Int {
        return distributionCustomerRepository.countAllByDistributionFirstByEndedAtIsNullOrderByStartedAtDesc()
    }

}
