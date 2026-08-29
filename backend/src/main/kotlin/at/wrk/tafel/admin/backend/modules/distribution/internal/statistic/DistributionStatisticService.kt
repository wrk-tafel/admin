package at.wrk.tafel.admin.backend.modules.distribution.internal.statistic

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDateTime
import java.time.Period
import java.time.format.DateTimeFormatter

@Service
class DistributionStatisticService(
    private val distributionStatisticRepository: DistributionStatisticRepository,
    private val householdRepository: HouseholdRepository,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionStatisticService::class.java)
    }

    fun saveStatistic(distribution: DistributionEntity): DistributionStatisticEntity {
        val statisticEntry = saveStatisticEntry(distribution)
        val savedStatisticEntry = distributionStatisticRepository.save(statisticEntry)

        logger.info(
            "Created statistic entry for distribution id: ${distribution.id}, end-date: ${
                distribution.endedAt!!.format(
                    DateTimeFormatter.ofPattern("dd.MM.yyyy"),
                )
            }",
        )
        return savedStatisticEntry
    }

    private fun saveStatisticEntry(distribution: DistributionEntity): DistributionStatisticEntity {
        val statistic = distribution.statistic ?: throw BusinessRuleException("Statistik-Daten nicht vorhanden!")
        val statisticStartTime = distribution.startedAt.toLocalDate().atStartOfDay()
        val statisticEndTime = distribution.endedAt!!
        statistic.distribution = distribution

        fillHouseholdStatistics(distribution, statisticStartTime, statisticEndTime, statistic)
        fillLogisticsStatistics(distribution, statistic)

        return statistic
    }

    /**
     * `countCustomersUpdated` is derived by subtraction, not a dedicated query: it's every
     * household updated in the window ([HouseholdRepository.countByUpdatedAtBetween]) minus the
     * ones already counted as new or prolonged, since those also touch `updated_at` and would
     * otherwise be double-counted across the three statistics.
     */
    private fun fillHouseholdStatistics(
        distribution: DistributionEntity,
        statisticStartTime: LocalDateTime,
        statisticEndTime: LocalDateTime,
        statistic: DistributionStatisticEntity,
    ) {
        val countHouseholds = distribution.households.size
        statistic.countCustomers = countHouseholds

        val countPersons =
            distribution.households.flatMap { it.household.additionalPersons() }
                .filterNot { it.excludeFromHousehold }
                .count() + countHouseholds
        statistic.countPersons = countPersons

        // ages are counted as of the distribution's own day, not as of today, so re-running this for
        // a past distribution yields the same numbers it did when that distribution closed
        val referenceDate = distribution.startedAt.toLocalDate()
        val countInfants = distribution.households.flatMap { it.household.additionalPersons() }
            .filterNot { it.excludeFromHousehold }
            .count { it.birthDate != null && Period.between(it.birthDate, referenceDate).years < 3 }
        statistic.countInfants = countInfants

        val averagePersonsPerHousehold = if (countHouseholds > 0) {
            BigDecimal(countPersons).setScale(2, RoundingMode.HALF_EVEN)
                .div(BigDecimal(countHouseholds))
        } else {
            BigDecimal.ZERO
        }
        statistic.averagePersonsPerCustomer = averagePersonsPerHousehold

        val householdsNew =
            householdRepository.findAllByCreatedAtBetween(statisticStartTime, statisticEndTime)
        val countHouseholdsNew = householdsNew.size
        statistic.countCustomersNew = countHouseholdsNew

        val countPersonsNew =
            householdsNew.flatMap { it.additionalPersons() }
                .filterNot { it.excludeFromHousehold }.size + countHouseholdsNew
        statistic.countPersonsNew = countPersonsNew

        val householdsProlonged =
            householdRepository.findAllByProlongedAtBetween(statisticStartTime, statisticEndTime)
        val countHouseholdsProlonged = householdsProlonged.size
        statistic.countCustomersProlonged = countHouseholdsProlonged

        val countPersonsProlonged =
            householdsProlonged.flatMap { it.additionalPersons() }
                .filterNot { it.excludeFromHousehold }.size + countHouseholdsProlonged
        statistic.countPersonsProlonged = countPersonsProlonged

        val countHouseholdsUpdated =
            householdRepository.countByUpdatedAtBetween(
                statisticStartTime,
                statisticEndTime,
            )
        statistic.countCustomersUpdated = countHouseholdsUpdated - countHouseholdsNew - countHouseholdsProlonged

        statistic.countSingleParentHouseholds =
            distribution.households.count { it.household.singleParent }
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
            .filter { it.amount > 0 }
            .mapNotNull { it.shop }
            .distinctBy { it.id }
            .count()
        statistic.shopsWithFoodCount = shopsWithFoodCount

        val foodTotalAmount = distribution.foodCollections
            .flatMap { it.items ?: emptyList() }
            .map { it.weight }
            .sumOf { it }
        statistic.foodTotalAmount = foodTotalAmount

        val foodPerShopAverage =
            if (shopsWithFoodCount > 0) {
                foodTotalAmount.divide(
                    BigDecimal(shopsWithFoodCount),
                    2,
                    RoundingMode.HALF_EVEN,
                )
            } else {
                BigDecimal.ZERO
            }
        statistic.foodPerShopAverage = foodPerShopAverage

        val routesLengthKm = distribution.foodCollections
            .sumOf { (it.kmEnd ?: 0) - (it.kmStart ?: 0) }
        statistic.routesLengthKm = routesLengthKm
    }
}
