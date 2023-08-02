package at.wrk.tafel.admin.backend.modules.distribution.statistic

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.Period

@Service
class DistributionStatisticService(
    private val distributionStatisticRepository: DistributionStatisticRepository,
    private val customerRepository: CustomerRepository
) {

    fun createAndSaveStatistic(distribution: DistributionEntity) {
        val statistic = createStatisticEntry(distribution)
        distributionStatisticRepository.save(statistic)
    }

    private fun createStatisticEntry(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = DistributionStatisticEntity()

        val countCustomers = distribution.customers.size
        val countPersons = distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
            .filterNot { it.excludeFromHousehold!! }
            .count() + distribution.customers.size
        val countInfants = distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
            .filterNot { it.excludeFromHousehold!! }
            .count { Period.between(it.birthDate, LocalDate.now()).years < 3 }
        val averagePersonsPerCustomer = if (countCustomers > 0)
            BigDecimal(countPersons).setScale(2, RoundingMode.HALF_EVEN)
                .div(BigDecimal(countCustomers)) else BigDecimal.ZERO
        val countCustomersNew =
            customerRepository.countByCreatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        val countCustomersProlonged =
            customerRepository.countByProlongedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        val countCustomersUpdated =
            customerRepository.countByUpdatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)

        statistic.distribution = distribution
        statistic.countCustomers = countCustomers
        statistic.countPersons = countPersons
        statistic.countInfants = countInfants
        statistic.averagePersonsPerCustomer = averagePersonsPerCustomer
        statistic.countCustomersNew = countCustomersNew
        statistic.countCustomersProlonged = countCustomersProlonged
        statistic.countCustomersUpdated = countCustomersUpdated - countCustomersProlonged

        return statistic
    }

}
