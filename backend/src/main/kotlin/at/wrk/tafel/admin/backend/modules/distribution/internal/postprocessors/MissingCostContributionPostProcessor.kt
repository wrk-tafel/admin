package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate

@Component
class MissingCostContributionPostProcessor(
    private val householdRepository: HouseholdRepository,
    private val staticValueRepository: StaticValueRepository,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(MissingCostContributionPostProcessor::class.java)
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val costContributionValue = staticValueRepository.findSingleValueOfType(
            StaticValueType.COST_CONTRIBUTION,
            LocalDate.now(),
        )
        if (costContributionValue == null) {
            throw TafelValidationException("No cost contribution value found. Skipping missing cost contribution post processing.")
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
