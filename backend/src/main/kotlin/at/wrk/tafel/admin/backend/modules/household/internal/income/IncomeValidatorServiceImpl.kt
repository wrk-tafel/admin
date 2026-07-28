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
 * 2. Add a family allowance: per child flagged `receivesFamilyAllowance`, an age-tiered [StaticValueType.FAMILY_ALLOWANCE]
 *    amount plus a flat [StaticValueType.CHILD_TAX_ALLOWANCE], plus a [StaticValueType.SIBLING_ADDITION]
 *    that scales with the number of qualifying children (capped at the highest configured tier for 7+).
 * 3. Determine the base limit from [StaticValueRepository.findLatestForPersonCount] for the
 *    adult/child counts, then add [StaticValueType.ADDITIONAL_ADULT] / [StaticValueType.ADDITIONAL_CHILD]
 *    for persons beyond the base household size (2 adults, 2 or 3 children depending on adult count),
 *    plus a [StaticValueType.TOLERANCE] buffer.
 * 4. Valid when the income sum does not exceed the resulting limit.
 */
@Service
class IncomeValidatorServiceImpl(
    private val staticValueRepository: StaticValueRepository,
) : IncomeValidatorService {

    override fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult {
        require(persons.isNotEmpty()) { "No persons given" }

        val personsToInclude = persons.filterNot { it.excludeFromIncomeCalculation }

        val familyAllowanceSum = calculateFamilyAllowance(persons.filter { it.receivesFamilyAllowance })
        val incomeSum = personsToInclude.sumOf { it.monthlyIncome ?: BigDecimal.ZERO }

        val overallIncome = incomeSum + familyAllowanceSum
        return calculateOverallResult(personsToInclude, overallIncome)
    }

    private fun calculateFamilyAllowance(persons: List<IncomeValidatorPerson>): BigDecimal {
        var monthlySum = persons.sumOf { person ->
            var monthlySum = BigDecimal.ZERO

            if (person.isChildForFamilyAllowance()) {
                monthlySum += getFamilyAllowanceForAge(person.getAge()) ?: BigDecimal.ZERO

                val childTaxAllowanceValue = staticValueRepository
                    .findSingleValueOfType(type = StaticValueType.CHILD_TAX_ALLOWANCE, currentDate = LocalDate.now())
                    ?.amount ?: BigDecimal.ZERO
                monthlySum += childTaxAllowanceValue
            }

            monthlySum
        }

        monthlySum += calculateSiblingAddition(persons)
        return monthlySum
    }

    private fun calculateSiblingAddition(
        persons: List<IncomeValidatorPerson>,
    ): BigDecimal {
        val countChildren = persons.count { it.isChildForFamilyAllowance() }

        val siblingAdditionLimits = staticValueRepository.findValuesOfType(
            type = StaticValueType.SIBLING_ADDITION,
            currentDate = LocalDate.now(),
        )
        val siblingAdditionValue: BigDecimal = if (countChildren >= 7) {
            siblingAdditionLimits.sortedBy { it.countChildren }.last().amount
        } else {
            siblingAdditionLimits
                .asSequence()
                .filter { it.countChildren == countChildren }
                .firstOrNull()
                ?.amount
        } ?: BigDecimal.ZERO

        return siblingAdditionValue.multiply(countChildren.toBigDecimal())
    }

    private fun getFamilyAllowanceForAge(age: Int): BigDecimal? = staticValueRepository.findValuesOfType(
        type = StaticValueType.FAMILY_ALLOWANCE,
        currentDate = LocalDate.now(),
    )
        .asSequence()
        .sortedByDescending { it.age }
        .filter { (it.age ?: 0) >= age }
        .map { it.amount }
        .firstOrNull()

    private fun calculateOverallResult(
        persons: List<IncomeValidatorPerson>,
        monthlyIncomeSum: BigDecimal,
    ): IncomeValidatorResult {
        var valid = false

        var limit = determineLimit(persons)

        val toleranceValue =
            staticValueRepository.findSingleValueOfType(type = StaticValueType.TOLERANCE, currentDate = LocalDate.now())
        limit = limit.add(toleranceValue?.amount ?: BigDecimal.ZERO)

        val differenceFromLimit = limit.subtract(monthlyIncomeSum)
        if (differenceFromLimit >= BigDecimal.ZERO) {
            valid = true
        }

        return IncomeValidatorResult(
            valid = valid,
            totalSum = monthlyIncomeSum,
            limit = limit,
            toleranceValue = toleranceValue?.amount ?: BigDecimal.ZERO,
            amountExceededLimit = if (!valid) differenceFromLimit.abs() else BigDecimal.ZERO,
        )
    }

    private fun determineLimit(persons: List<IncomeValidatorPerson>): BigDecimal {
        var overallLimit = BigDecimal.ZERO

        val countPersons = persons.count { !it.isChild() }
        val countChildren = persons.count { it.isChild() }
        val countAdditionalPersons = max(0, countPersons - 2)

        val childrenLimit = if (countPersons == 1) 2 else 3
        val countAdditionalChildren = max(0, countChildren - childrenLimit)

        val staticValueType =
            staticValueRepository.findLatestForPersonCount(
                currentDate = LocalDate.now(),
                countAdults = (countPersons - countAdditionalPersons),
                countChildren = (countChildren - countAdditionalChildren),
            )
        staticValueType?.let { overallLimit = overallLimit.add(it.amount ?: BigDecimal.ZERO) }

        val additionalAdultLimit =
            staticValueRepository.findSingleValueOfType(
                type = StaticValueType.ADDITIONAL_ADULT,
                currentDate = LocalDate.now(),
            )?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit =
            staticValueRepository.findSingleValueOfType(
                type = StaticValueType.ADDITIONAL_CHILD,
                currentDate = LocalDate.now(),
            )?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }
}
