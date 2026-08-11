package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.math.max

/**
 * Validates a household's combined monthly income against a configurable limit.
 *
 * All limits/bonuses come from the [IncomeRateCard] in effect on the day of the validation rather
 * than from code, so they can be adjusted per [StaticValueType] over time without a code change.
 * The card is resolved once per run ([validateAll] shares one across every household it is given)
 * and the arithmetic below is a pure function of the persons and that card. The overall algorithm:
 * 1. Sum `monthlyIncome` for persons not flagged `excludeFromIncomeCalculation`.
 * 2. Add a family allowance ([calculateFamilyAllowanceSum]): per child flagged
 *    `receivesFamilyAllowance`, an age-tiered Familienbeihilfe
 *    ([IncomeRateCard.familyAllowanceForAge]) amount plus a flat Kinderabsetzbetrag
 *    ([IncomeRateCard.childTaxAllowance]), plus a Geschwisterstaffel sibling addition
 *    ([IncomeRateCard.siblingAdditionPerChild]) that scales with the number of qualifying children.
 * 3. Determine the limit ([calculateLimit]) from [IncomeRateCard.incomeLimit] for the adult/child
 *    counts, then add [IncomeRateCard.additionalAdultLimit] / [IncomeRateCard.additionalChildLimit]
 *    for persons beyond the base household size ([BASE_HOUSEHOLD_ADULTS] adults,
 *    [BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT] or [BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS] children
 *    depending on adult count), plus a [IncomeRateCard.tolerance] buffer.
 * 4. Valid when the income sum does not exceed the resulting limit.
 */
@Service
class IncomeValidatorServiceImpl(
    private val staticValueRepository: StaticValueRepository,
) : IncomeValidatorService {

    companion object {
        // A household's base limit (from IncomeRateCard.incomeLimit) already covers this many
        // adults, plus this many children (fewer if there's only a single adult in the
        // household) - anyone beyond that adds ADDITIONAL_ADULT/ADDITIONAL_CHILD on top.
        private const val BASE_HOUSEHOLD_ADULTS = 2
        private const val BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT = 2
        private const val BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS = 3
    }

    override fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult = validate(persons, currentRateCard())

    override fun validateAll(personsPerHousehold: List<List<IncomeValidatorPerson>>): List<IncomeValidatorResult> {
        val rateCard = currentRateCard()
        return personsPerHousehold.map { validate(it, rateCard) }
    }

    private fun currentRateCard(): IncomeRateCard {
        val today = LocalDate.now()
        return IncomeRateCard(referenceDate = today, values = staticValueRepository.findAllValidAt(today))
    }

    private fun validate(persons: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): IncomeValidatorResult {
        require(persons.isNotEmpty()) { "No persons given" }

        val includedPersons = persons.filterNot { it.excludeFromIncomeCalculation }
        val incomeSum = includedPersons.sumOf { it.monthlyIncome ?: BigDecimal.ZERO }

        val familyAllowanceRecipients = persons.filter { it.receivesFamilyAllowance }
        val familyAllowanceSum = calculateFamilyAllowanceSum(familyAllowanceRecipients, rateCard)

        val totalIncome = incomeSum + familyAllowanceSum
        val limit = calculateLimit(includedPersons, rateCard)

        return buildResult(totalIncome = totalIncome, limit = limit, rateCard = rateCard)
    }

    /**
     * Familienbeihilfe (age-tiered) plus Kinderabsetzbetrag (flat, per child) for every person
     * flagged as receiving family allowance, plus the Geschwisterstaffel sibling addition.
     */
    private fun calculateFamilyAllowanceSum(recipients: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): BigDecimal {
        val children = recipients.filter { it.isChildForFamilyAllowance(rateCard.referenceDate) }

        val perChildAllowanceSum = children.sumOf { child ->
            rateCard.familyAllowanceForAge(child.getAge(rateCard.referenceDate)) + rateCard.childTaxAllowance()
        }

        val siblingAddition = rateCard.siblingAdditionPerChild(countChildren = children.size)
            .multiply(children.size.toBigDecimal())

        return perChildAllowanceSum + siblingAddition
    }

    /**
     * Base limit for the household's adult/child counts, plus ADDITIONAL_ADULT/ADDITIONAL_CHILD
     * for every person beyond the base household size.
     */
    private fun calculateLimit(persons: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): BigDecimal {
        val countAdults = persons.count { !it.isChild(rateCard.referenceDate) }
        val countChildren = persons.count { it.isChild(rateCard.referenceDate) }

        val countAdditionalAdults = max(0, countAdults - BASE_HOUSEHOLD_ADULTS)
        val baseChildrenLimit = if (countAdults == 1) {
            BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT
        } else {
            BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS
        }
        val countAdditionalChildren = max(0, countChildren - baseChildrenLimit)

        val baseLimit = rateCard.incomeLimit(
            countAdults = countAdults - countAdditionalAdults,
            countChildren = countChildren - countAdditionalChildren,
        )

        return baseLimit
            .add(rateCard.additionalAdultLimit().multiply(countAdditionalAdults.toBigDecimal()))
            .add(rateCard.additionalChildLimit().multiply(countAdditionalChildren.toBigDecimal()))
    }

    private fun buildResult(totalIncome: BigDecimal, limit: BigDecimal, rateCard: IncomeRateCard): IncomeValidatorResult {
        val toleranceValue = rateCard.tolerance()
        val limitWithTolerance = limit.add(toleranceValue)

        val differenceFromLimit = limitWithTolerance.subtract(totalIncome)
        val valid = differenceFromLimit >= BigDecimal.ZERO

        return IncomeValidatorResult(
            valid = valid,
            totalSum = totalIncome,
            limit = limitWithTolerance,
            toleranceValue = toleranceValue,
            amountExceededLimit = if (valid) BigDecimal.ZERO else differenceFromLimit.abs(),
        )
    }
}
