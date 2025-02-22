package at.wrk.tafel.admin.backend.modules.distribution.internal.statistic

import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.format.DateTimeFormatter

@Service
class DistributionStatisticService(
    private val distributionStatisticRepository: DistributionStatisticRepository,
    private val customerRepository: CustomerRepository,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionStatisticService::class.java)
    }

    fun createAndSaveStatistic(distribution: DistributionEntity): DistributionStatisticEntity {
        val statisticEntry = getOrCreateStatisticEntry(distribution)
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

    private fun getOrCreateStatisticEntry(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = distribution.statistic ?: throw TafelValidationException("Statistik-Daten nicht vorhanden!")
        val statisticStartTime = distribution.startedAt!!.toLocalDate().atStartOfDay()
        val statisticEndTime = distribution.endedAt!!
        statistic.distribution = distribution

        fillCustomerStatistics(distribution, statisticStartTime, statisticEndTime, statistic)
        fillLogisticsStatistics(distribution, statistic)

        return statistic
    }

    private fun fillCustomerStatistics(
        distribution: DistributionEntity,
        statisticStartTime: LocalDateTime,
        statisticEndTime: LocalDateTime,
        statistic: DistributionStatisticEntity,
    ) {
        val countCustomers = distribution.customers.size
        statistic.countCustomers = countCustomers

        val countPersons =
            distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
                .filterNot { it.excludeFromHousehold!! }
                .count() + countCustomers
        statistic.countPersons = countPersons

        val countInfants = distribution.customers.flatMap { it.customer?.additionalPersons ?: emptyList() }
            .filterNot { it.excludeFromHousehold!! }
            .count { Period.between(it.birthDate, LocalDate.now()).years < 3 }
        statistic.countInfants = countInfants

        val averagePersonsPerCustomer = if (countCustomers > 0)
            BigDecimal(countPersons).setScale(2, RoundingMode.HALF_EVEN)
                .div(BigDecimal(countCustomers)) else BigDecimal.ZERO
        statistic.averagePersonsPerCustomer = averagePersonsPerCustomer

        val customersNew =
            customerRepository.findAllByCreatedAtBetween(statisticStartTime, statisticEndTime)
        val countCustomersNew = customersNew.size
        statistic.countCustomersNew = countCustomersNew

        val countPersonsNew =
            customersNew.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: false }.size + countCustomersNew
        statistic.countPersonsNew = countPersonsNew

        val customersProlonged =
            customerRepository.findAllByProlongedAtBetween(statisticStartTime, statisticEndTime)
        val countCustomersProlonged = customersProlonged.size
        statistic.countCustomersProlonged = countCustomersProlonged

        val countPersonsProlonged =
            customersProlonged.flatMap { it.additionalPersons }
                .filterNot { it.excludeFromHousehold ?: false }.size + countCustomersProlonged
        statistic.countPersonsProlonged = countPersonsProlonged

        val countCustomersUpdated =
            customerRepository.countByUpdatedAtBetween(
                statisticStartTime,
                statisticEndTime
            )
        statistic.countCustomersUpdated = countCustomersUpdated - countCustomersNew - countCustomersProlonged
    }

    private fun fillLogisticsStatistics(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val shopsTotalCount = distribution.foodCollections
            .flatMap { it.items ?: emptyList() }
            .mapNotNull { it.shop }
            .distinctBy { it.id }
            .count()
        statistic.shopsTotalCount = shopsTotalCount

        val shopsWithFoodCount = distribution.foodCollections
            .asSequence()
            .flatMap { it.items ?: emptyList() }
            .filter { (it.amount ?: 0) > 0 }
            .mapNotNull { it.shop }
            .distinctBy { it.id }
            .count()
        statistic.shopsWithFoodCount = shopsWithFoodCount

        val foodTotalAmount = distribution.foodCollections
            .flatMap { it.items ?: emptyList() }
            .map { it.calculateWeight() }
            .sumOf { it }
        statistic.foodTotalAmount = foodTotalAmount

        val foodPerShopAverage =
            if (shopsWithFoodCount > 0) foodTotalAmount.divide(
                BigDecimal(shopsWithFoodCount),
                2,
                RoundingMode.HALF_EVEN
            )
            else BigDecimal.ZERO
        statistic.foodPerShopAverage = foodPerShopAverage

        val routesLengthKm = distribution.foodCollections
            .sumOf { (it.kmEnd ?: 0) - (it.kmStart ?: 0) }
        statistic.routesLengthKm = routesLengthKm
    }

}
