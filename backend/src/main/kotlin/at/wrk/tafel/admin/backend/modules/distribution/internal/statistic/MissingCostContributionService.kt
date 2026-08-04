package at.wrk.tafel.admin.backend.modules.distribution.internal.statistic

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate

/**
 * Called by [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionEndedEventListener]
 * right after a distribution closes. Mutates persistent household state as a side effect: for every
 * household whose
 * [at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity.costContributionPaid]
 * is false, adds the current [StaticValueType.COST_CONTRIBUTION] amount to
 * [HouseholdEntity.pendingCostContribution] so it can be collected next time. Deliberately not called
 * by [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService.sendMails] (the
 * manual mail re-send), since re-running it would double-count pending contributions for households
 * that already had them added when the distribution originally closed - that's why `sendMails()`
 * publishes `DistributionClosedEvent` directly instead of
 * [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionEndedEvent], which is what
 * triggers this service in the first place.
 */
@Service
class MissingCostContributionService(
    private val householdRepository: HouseholdRepository,
    private val staticValueRepository: StaticValueRepository,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(MissingCostContributionService::class.java)
    }

    fun addMissingCostContributions(distribution: DistributionEntity) {
        val costContributionValue = staticValueRepository.findSingleValueOfType(
            StaticValueType.COST_CONTRIBUTION,
            LocalDate.now(),
        )
        if (costContributionValue == null) {
            throw BusinessRuleException("No cost contribution value found. Skipping missing cost contribution post processing.")
        }

        val householdsMissingCostContribution = distribution.households
            .filter { it.costContributionPaid == false }
            .mapNotNull { it.household }

        householdsMissingCostContribution.forEach { household ->
            addPendingCostContribution(household, costContributionValue)
        }
    }

    private fun addPendingCostContribution(
        household: HouseholdEntity,
        costContributionValue: StaticValueEntity,
    ) {
        val householdEntity = householdRepository.findByIdOrNull(household.id!!)
        if (householdEntity != null) {
            val currentPendingCostContribution = householdEntity.pendingCostContribution
            householdEntity.pendingCostContribution =
                currentPendingCostContribution.add(costContributionValue.amount ?: BigDecimal.ZERO)
            householdRepository.save(householdEntity)
        } else {
            logger.error("Household with id ${household.id} not found in database")
        }
    }
}
