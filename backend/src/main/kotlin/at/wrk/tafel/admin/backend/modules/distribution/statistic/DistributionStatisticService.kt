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

    fun createAndSaveStatistic(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = createStatisticEntry(distribution)
        return distributionStatisticRepository.save(statistic)
    }

    private fun createStatisticEntry(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = DistributionStatisticEntity()

        val countCustomers = distribution.customers.size
        val countPersons =
            distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
                .filterNot { it.excludeFromHousehold!! }
                .count() + distribution.customers.size
        val countInfants = distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
            .filterNot { it.excludeFromHousehold!! }
            .count { Period.between(it.birthDate, LocalDate.now()).years < 3 }
        val averagePersonsPerCustomer = if (countCustomers > 0)
            BigDecimal(countPersons).setScale(2, RoundingMode.HALF_EVEN)
                .div(BigDecimal(countCustomers)) else BigDecimal.ZERO

        val customersNew =
            customerRepository.findAllByCreatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        val countCustomersNew = customersNew.size
        val countPersonsNew =
            customersNew.size + customersNew.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: true }.size

        val customersProlonged =
            customerRepository.findAllByProlongedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        val countCustomersProlonged = customersProlonged.size
        val countPersonsProlonged =
            customersProlonged.size + customersProlonged.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: true }.size

        val countCustomersUpdated =
            customerRepository.countByUpdatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)

        statistic.distribution = distribution
        statistic.countCustomers = countCustomers
        statistic.countPersons = countPersons
        statistic.countInfants = countInfants
        statistic.averagePersonsPerCustomer = averagePersonsPerCustomer
        statistic.countCustomersNew = countCustomersNew
        statistic.countPersonsNew = countPersonsNew
        statistic.countCustomersProlonged = countCustomersProlonged
        statistic.countPersonsProlonged = countPersonsProlonged
        statistic.countCustomersUpdated = countCustomersUpdated - countCustomersProlonged

        return statistic
    }

}
