package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
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
    private val customerRepository: CustomerRepository,
    private val staticValueRepository: StaticValueRepository,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(MissingCostContributionPostProcessor::class.java)
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val costContributionValue = staticValueRepository.findSingleValueOfType(
            StaticValueType.COST_CONTRIBUTION, LocalDate.now()
        )
        if (costContributionValue == null) {
            throw TafelValidationException("No cost contribution value found. Skipping missing cost contribution post processing.")
        }

        val customersMissingCostContribution = distribution.customers
            .filter { it.costContributionPaid == false }
            .mapNotNull { it.customer }

        customersMissingCostContribution.forEach { customer ->
            addPendingCostContribution(customer, costContributionValue)
        }
    }

    private fun addPendingCostContribution(
        customer: CustomerEntity,
        costContributionValue: StaticValueEntity,
    ) {
        val customerEntity = customerRepository.findByIdOrNull(customer.id!!)
        if (customerEntity != null) {
            val currentPendingCostContribution = customerEntity.pendingCostContribution
            customerEntity.pendingCostContribution =
                currentPendingCostContribution.add(costContributionValue.amount ?: BigDecimal.ZERO)
            customerRepository.save(customerEntity)
        } else {
            logger.error("Customer with id ${customer.id} not found in database")
        }
    }

}
