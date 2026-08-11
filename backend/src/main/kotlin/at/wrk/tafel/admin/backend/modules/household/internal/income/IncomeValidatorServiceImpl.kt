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
 * All limits/bonuses are read from [StaticValueRepository] rather than hardcoded, so they can be
 * adjusted per [StaticValueType] over time (each lookup is date-scoped via `currentDate`) without
 * a code change. The overall algorithm:
 * 1. Sum `monthlyIncome` for persons not flagged `excludeFromIncomeCalculation`.
 * 2. Add a family allowance ([calculateFamilyAllowanceSum]): per child flagged
 *    `receivesFamilyAllowance`, an age-tiered Familienbeihilfe ([StaticValueType.FAMILY_ALLOWANCE],
 *    tiers being "from age X" brackets - see [familyAllowanceForAge])
 *    amount plus a flat Kinderabsetzbetrag ([StaticValueType.CHILD_TAX_ALLOWANCE]), plus a
 *    Geschwisterstaffel sibling addition ([StaticValueType.SIBLING_ADDITION]) that scales with the
 *    number of qualifying children (capped at the highest configured tier for
 *    [SIBLING_ADDITION_MAX_TIER_CHILDREN]+ children).
 * 3. Determine the limit ([calculateLimit]) from [StaticValueRepository.findLatestForPersonCount]
 *    for the adult/child counts, then add [StaticValueType.ADDITIONAL_ADULT] /
 *    [StaticValueType.ADDITIONAL_CHILD] for persons beyond the base household size
 *    ([BASE_HOUSEHOLD_ADULTS] adults, [BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT] or
 *    [BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS] children depending on adult count), plus a
 *    [StaticValueType.TOLERANCE] buffer.
 * 4. Valid when the income sum does not exceed the resulting limit.
 */
@Service
class IncomeValidatorServiceImpl(
    private val staticValueRepository: StaticValueRepository,
) : IncomeValidatorService {

    companion object {
        // A household's base limit (from findLatestForPersonCount) already covers this many
        // adults, plus this many children (fewer if there's only a single adult in the
        // household) - anyone beyond that adds ADDITIONAL_ADULT/ADDITIONAL_CHILD on top.
        private const val BASE_HOUSEHOLD_ADULTS = 2
        private const val BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT = 2
        private const val BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS = 3

        // Sibling addition (Geschwisterstaffel) tiers stop increasing beyond this many
        // children - the highest configured tier is used for any larger count.
        private const val SIBLING_ADDITION_MAX_TIER_CHILDREN = 7
    }

    override fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult {
        require(persons.isNotEmpty()) { "No persons given" }

        val includedPersons = persons.filterNot { it.excludeFromIncomeCalculation }
        val incomeSum = includedPersons.sumOf { it.monthlyIncome ?: BigDecimal.ZERO }

        val familyAllowanceRecipients = persons.filter { it.receivesFamilyAllowance }
        val familyAllowance = calculateFamilyAllowance(familyAllowanceRecipients)
        val limit = calculateLimit(includedPersons)

        return buildResult(
            totalIncome = incomeSum + familyAllowance.sum(),
            limit = limit.sum(),
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
    private fun calculateFamilyAllowance(recipients: List<IncomeValidatorPerson>): FamilyAllowance {
        val children = recipients.filter { it.isChildForFamilyAllowance() }

        return FamilyAllowance(
            familyAllowanceSum = children.sumOf { familyAllowanceForAge(it.getAge()) },
            childTaxAllowanceSum = children.sumOf { childTaxAllowance() },
            siblingAdditionSum = siblingAddition(countChildren = children.size),
        )
    }

    /**
     * The Familienbeihilfe amount for a child of [age]. A tier's own `age` is the *lower* bound of a
     * "from age X" bracket, so the applicable tier is the highest one whose age the child has
     * already reached - a 1-year-old gets the `age = 0` tier, a 20-year-old the `age = 19` one.
     * Zero when no tier covers the age at all (i.e. the child is younger than the lowest tier).
     */
    private fun familyAllowanceForAge(age: Int): BigDecimal = staticValueRepository.findValuesOfType(
        type = StaticValueType.FAMILY_ALLOWANCE,
        currentDate = LocalDate.now(),
    )
        .asSequence()
        .sortedByDescending { it.age }
        .filter { (it.age ?: 0) <= age }
        .map { it.amount }
        .firstOrNull() ?: BigDecimal.ZERO

    private fun childTaxAllowance(): BigDecimal = staticValueRepository
        .findSingleValueOfType(type = StaticValueType.CHILD_TAX_ALLOWANCE, currentDate = LocalDate.now())
        ?.amount ?: BigDecimal.ZERO

    private fun siblingAddition(countChildren: Int): BigDecimal {
        val tiers = staticValueRepository.findValuesOfType(
            type = StaticValueType.SIBLING_ADDITION,
            currentDate = LocalDate.now(),
        )

        val amountPerChild = if (countChildren >= SIBLING_ADDITION_MAX_TIER_CHILDREN) {
            tiers.maxByOrNull { it.countChildren ?: 0 }?.amount
        } else {
            tiers.firstOrNull { it.countChildren == countChildren }?.amount
        } ?: BigDecimal.ZERO

        return amountPerChild.multiply(countChildren.toBigDecimal())
    }

    /**
     * Base limit for the household's adult/child counts, plus ADDITIONAL_ADULT/ADDITIONAL_CHILD
     * for every person beyond the base household size. Like [calculateFamilyAllowance], the parts
     * are returned rather than a total, since the result reports what the limit is made of.
     */
    private fun calculateLimit(persons: List<IncomeValidatorPerson>): Limit {
        val countAdults = persons.count { !it.isChild() }
        val countChildren = persons.count { it.isChild() }

        val countAdditionalAdults = max(0, countAdults - BASE_HOUSEHOLD_ADULTS)
        val baseChildrenLimit = if (countAdults == 1) {
            BASE_HOUSEHOLD_CHILDREN_SINGLE_ADULT
        } else {
            BASE_HOUSEHOLD_CHILDREN_MULTIPLE_ADULTS
        }
        val countAdditionalChildren = max(0, countChildren - baseChildrenLimit)

        val baseLimitCountAdults = countAdults - countAdditionalAdults
        val baseLimitCountChildren = countChildren - countAdditionalChildren

        val baseLimit = staticValueRepository.findLatestForPersonCount(
            currentDate = LocalDate.now(),
            countAdults = baseLimitCountAdults,
            countChildren = baseLimitCountChildren,
        )?.amount ?: BigDecimal.ZERO

        val additionalAdultLimit = staticValueRepository.findSingleValueOfType(
            type = StaticValueType.ADDITIONAL_ADULT,
            currentDate = LocalDate.now(),
        )?.amount ?: BigDecimal.ZERO

        val additionalChildLimit = staticValueRepository.findSingleValueOfType(
            type = StaticValueType.ADDITIONAL_CHILD,
            currentDate = LocalDate.now(),
        )?.amount ?: BigDecimal.ZERO

        return Limit(
            baseLimit = baseLimit,
            baseLimitCountAdults = baseLimitCountAdults,
            baseLimitCountChildren = baseLimitCountChildren,
            additionalAdultsCount = countAdditionalAdults,
            additionalAdultsSum = additionalAdultLimit.multiply(countAdditionalAdults.toBigDecimal()),
            additionalChildrenCount = countAdditionalChildren,
            additionalChildrenSum = additionalChildLimit.multiply(countAdditionalChildren.toBigDecimal()),
        )
    }

    private fun buildResult(
        totalIncome: BigDecimal,
        limit: BigDecimal,
        details: IncomeValidatorDetails,
    ): IncomeValidatorResult {
        val toleranceValue = tolerance()
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

    private fun tolerance(): BigDecimal = staticValueRepository
        .findSingleValueOfType(type = StaticValueType.TOLERANCE, currentDate = LocalDate.now())
        ?.amount ?: BigDecimal.ZERO

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
