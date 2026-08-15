package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
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
 * 2. Add a family allowance ([calculateFamilyAllowance]): per child flagged
 *    `receivesFamilyAllowance`, an age-tiered Familienbeihilfe
 *    ([IncomeRateCard.familyAllowanceForAge]) amount plus a flat Kinderabsetzbetrag
 *    ([IncomeRateCard.childTaxAllowance]), plus a Geschwisterstaffel sibling addition
 *    ([IncomeRateCard.siblingAdditionPerChild]) that scales with the number of qualifying children.
 * 3. Determine the limit ([calculateLimit]) from [IncomeRateCard.incomeLimit] for the adult/child
 *    counts, then add [IncomeRateCard.additionalAdultLimit] / [IncomeRateCard.additionalChildLimit]
 *    for persons beyond the base household size ([BASE_HOUSEHOLD_ADULTS] adults,
 *    [BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT] or [BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS] children
 *    depending on adult count), plus a [IncomeRateCard.tolerance] buffer. A composition with no
 *    configured limit at all is rejected rather than measured against zero.
 * 4. Valid when the income sum does not exceed the resulting limit.
 *
 * A person flagged `excludeFromIncomeCalculation` ("Nicht im selben Haushalt") is not part of the
 * household for any of those steps: their income is left out, their family allowance is left out,
 * they do not count towards the Geschwisterstaffel tier, and they do not raise the limit. Counting
 * only some of that would move a household's answer in one direction only - a child living
 * elsewhere would add their Familienbeihilfe and Kinderabsetzbetrag to an income limit they never
 * raise. Hence steps 1-3 all work off the same `includedPersons` list.
 *
 * Both sums are reported split into their parts as well ([IncomeValidatorDetails]), which is why
 * steps 2 and 3 return their pieces rather than a total.
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

    override fun validateAll(personsPerHousehold: List<List<IncomeValidatorPerson>>): List<Result<IncomeValidatorResult>> {
        val rateCard = currentRateCard()
        return personsPerHousehold.map { runCatching { validate(it, rateCard) } }
    }

    private fun currentRateCard(): IncomeRateCard {
        val today = LocalDate.now()
        return IncomeRateCard(referenceDate = today, values = staticValueRepository.findAllValidAt(today))
    }

    private fun validate(persons: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): IncomeValidatorResult {
        require(persons.isNotEmpty()) { "No persons given" }

        val includedPersons = persons.filterNot { it.excludeFromIncomeCalculation }
        val incomeSum = includedPersons.sumOf { it.monthlyIncome ?: BigDecimal.ZERO }

        val familyAllowanceRecipients = includedPersons.filter { it.receivesFamilyAllowance }
        val familyAllowance = calculateFamilyAllowance(familyAllowanceRecipients, rateCard)
        val limit = calculateLimit(includedPersons, rateCard)

        return buildResult(
            totalIncome = incomeSum + familyAllowance.sum(),
            limit = limit.sum(),
            rateCard = rateCard,
            details = IncomeValidatorDetails(
                incomeSum = incomeSum,
                familyAllowanceSum = familyAllowance.familyAllowanceSum,
                childTaxAllowanceSum = familyAllowance.childTaxAllowanceSum,
                siblingAdditionSum = familyAllowance.siblingAdditionSum,
                baseLimit = limit.baseLimit,
                baseLimitCountAdults = limit.baseLimitCountAdults,
                baseLimitCountChildren = limit.baseLimitCountChildren,
                additionalAdultsCount = limit.additionalAdultsCount,
                additionalAdultsSum = limit.additionalAdultsSum,
                additionalChildrenCount = limit.additionalChildrenCount,
                additionalChildrenSum = limit.additionalChildrenSum,
            ),
        )
    }

    /**
     * Familienbeihilfe (age-tiered) plus Kinderabsetzbetrag (flat, per child) for every person
     * flagged as receiving family allowance, plus the Geschwisterstaffel sibling addition. The
     * three stay apart instead of being summed on the spot because the result reports each of them.
     */
    private fun calculateFamilyAllowance(recipients: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): FamilyAllowance {
        val children = recipients.filter { it.isChildForFamilyAllowance(rateCard.referenceDate) }

        return FamilyAllowance(
            familyAllowanceSum = children.sumOf { rateCard.familyAllowanceForAge(it.getAge(rateCard.referenceDate)) },
            childTaxAllowanceSum = children.sumOf { rateCard.childTaxAllowance() },
            siblingAdditionSum = rateCard.siblingAdditionPerChild(countChildren = children.size)
                .multiply(children.size.toBigDecimal()),
        )
    }

    /**
     * Base limit for the household's adult/child counts, plus ADDITIONAL_ADULT/ADDITIONAL_CHILD
     * for every person beyond the base household size. Like [calculateFamilyAllowance], the parts
     * are returned rather than a total, since the result reports what the limit is made of.
     *
     * The counts are capped at the base household size before the lookup, so every composition that
     * can reach it has a configured row - except a household with no adult at all, which none
     * covers. That, and an `INCOME_LIMIT` row that is missing or whose validity window has lapsed,
     * is rejected with a [BusinessRuleException] naming the composition: unlike the allowances, a
     * base limit of zero is a meaningful value and must not double as "not configured".
     */
    private fun calculateLimit(persons: List<IncomeValidatorPerson>, rateCard: IncomeRateCard): Limit {
        val countAdults = persons.count { !it.isChild(rateCard.referenceDate) }
        val countChildren = persons.count { it.isChild(rateCard.referenceDate) }

        val countAdditionalAdults = max(0, countAdults - BASE_HOUSEHOLD_ADULTS)
        val baseChildrenLimit = if (countAdults == 1) {
            BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT
        } else {
            BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS
        }
        val countAdditionalChildren = max(0, countChildren - baseChildrenLimit)

        val baseLimitCountAdults = countAdults - countAdditionalAdults
        val baseLimitCountChildren = countChildren - countAdditionalChildren

        val baseLimit = rateCard.incomeLimit(
            countAdults = baseLimitCountAdults,
            countChildren = baseLimitCountChildren,
        ) ?: throw BusinessRuleException(
            "Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert " +
                "(Erwachsene: $baseLimitCountAdults, Kinder: $baseLimitCountChildren)!",
        )

        return Limit(
            baseLimit = baseLimit,
            baseLimitCountAdults = baseLimitCountAdults,
            baseLimitCountChildren = baseLimitCountChildren,
            additionalAdultsCount = countAdditionalAdults,
            additionalAdultsSum = rateCard.additionalAdultLimit().multiply(countAdditionalAdults.toBigDecimal()),
            additionalChildrenCount = countAdditionalChildren,
            additionalChildrenSum = rateCard.additionalChildLimit().multiply(countAdditionalChildren.toBigDecimal()),
        )
    }

    private fun buildResult(
        totalIncome: BigDecimal,
        limit: BigDecimal,
        rateCard: IncomeRateCard,
        details: IncomeValidatorDetails,
    ): IncomeValidatorResult {
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
            details = details,
        )
    }

    private data class FamilyAllowance(
        val familyAllowanceSum: BigDecimal,
        val childTaxAllowanceSum: BigDecimal,
        val siblingAdditionSum: BigDecimal,
    ) {
        fun sum(): BigDecimal = familyAllowanceSum + childTaxAllowanceSum + siblingAdditionSum
    }

    private data class Limit(
        val baseLimit: BigDecimal,
        val baseLimitCountAdults: Int,
        val baseLimitCountChildren: Int,
        val additionalAdultsCount: Int,
        val additionalAdultsSum: BigDecimal,
        val additionalChildrenCount: Int,
        val additionalChildrenSum: BigDecimal,
    ) {
        fun sum(): BigDecimal = baseLimit + additionalAdultsSum + additionalChildrenSum
    }
}
