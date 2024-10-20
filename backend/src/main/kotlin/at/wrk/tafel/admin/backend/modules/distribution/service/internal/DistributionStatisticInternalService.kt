package at.wrk.tafel.admin.backend.modules.distribution.service.internal

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter

@Service
class DistributionStatisticInternalService(
    private val distributionStatisticRepository: DistributionStatisticRepository,
    private val customerRepository: CustomerRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionStatisticInternalService::class.java)
    }

    fun createAndSaveStatistic(distribution: DistributionEntity): DistributionStatisticEntity {
        val statisticEntry = createStatisticEntry(distribution)
        val savedStatisticEntry = distributionStatisticRepository.save(statisticEntry)

        logger.info(
            "Created statistic entry for distribution id: ${distribution.id}, end-date: ${
                distribution.endedAt!!.format(
                    DateTimeFormatter.ofPattern("dd.MM.yyyy")
                )
            }"
        )
        return savedStatisticEntry
    }

    private fun createStatisticEntry(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = DistributionStatisticEntity()
        val statisticStartTime = distribution.startedAt!!.toLocalDate().atStartOfDay()
        val statisticEndTime = distribution.endedAt!!

        val countCustomers = distribution.customers.size
        val countPersons =
            distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
                .filterNot { it.excludeFromHousehold!! }
                .count() + countCustomers
        val countInfants = distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
            .filterNot { it.excludeFromHousehold!! }
            .count { Period.between(it.birthDate, LocalDate.now()).years < 3 }
        val averagePersonsPerCustomer = if (countCustomers > 0)
            BigDecimal(countPersons).setScale(2, RoundingMode.HALF_EVEN)
                .div(BigDecimal(countCustomers)) else BigDecimal.ZERO

        val customersNew =
            customerRepository.findAllByCreatedAtBetween(statisticStartTime, statisticEndTime)
        val countCustomersNew = customersNew.size
        val countPersonsNew =
            customersNew.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: false }.size + countCustomersNew

        val customersProlonged =
            customerRepository.findAllByProlongedAtBetween(statisticStartTime, statisticEndTime)
        val countCustomersProlonged = customersProlonged.size
        val countPersonsProlonged =
            customersProlonged.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: false }.size + countCustomersProlonged

        val countCustomersUpdated =
            customerRepository.countByUpdatedAtBetween(
                statisticStartTime,
                statisticEndTime
            )

        statistic.distribution = distribution
        statistic.countCustomers = countCustomers
        statistic.countPersons = countPersons
        statistic.countInfants = countInfants
        statistic.averagePersonsPerCustomer = averagePersonsPerCustomer
        statistic.countCustomersNew = countCustomersNew
        statistic.countPersonsNew = countPersonsNew
        statistic.countCustomersProlonged = countCustomersProlonged
        statistic.countPersonsProlonged = countPersonsProlonged
        statistic.countCustomersUpdated = countCustomersUpdated - countCustomersNew - countCustomersProlonged

        return statistic
    }

}
