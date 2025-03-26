package at.wrk.tafel.admin.backend.modules.customer.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeLimitRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeLimitType
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.math.max

@Service
class IncomeValidatorServiceImpl(
    private val incomeLimitRepository: IncomeLimitRepository,
) : IncomeValidatorService {

    override fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult {
        require(persons.isNotEmpty()) { "No persons given" }

        val personsToInclude = persons.filterNot { it.excludeFromIncomeCalculation }

        val familyBonusSum = calculateFamilyBonus(persons.filter { it.receivesFamilyBonus })
        val incomeSum = personsToInclude.sumOf { it.monthlyIncome ?: BigDecimal.ZERO }

        val overallIncome = incomeSum + familyBonusSum
        return calculateOverallResult(personsToInclude, overallIncome)
    }

    private fun calculateFamilyBonus(persons: List<IncomeValidatorPerson>): BigDecimal {
        var monthlySum = persons.sumOf { person ->
            var monthlySum = BigDecimal.ZERO

            if (person.isChildForFamilyBonus()) {
                monthlySum += getFamilyBonusForAge(person.getAge()) ?: BigDecimal.ZERO

                val childTaxAllowanceValue = incomeLimitRepository
                    .findSingleValueOfType(type = IncomeLimitType.CHILD_TAX_ALLOWANCE, currentDate = LocalDate.now())
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
        val countChildren = persons.count { it.isChildForFamilyBonus() }

        val siblingAdditionLimits = incomeLimitRepository.findValuesOfType(
            type = IncomeLimitType.SIBLING_ADDITION,
            currentDate = LocalDate.now()
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

    private fun getFamilyBonusForAge(age: Int): BigDecimal? {
        return incomeLimitRepository.findValuesOfType(
            type = IncomeLimitType.FAMILY_BONUS,
            currentDate = LocalDate.now()
        )
            .asSequence()
            .sortedByDescending { it.age }
            .filter { (it.age ?: 0) >= age }
            .map { it.amount }
            .firstOrNull()
    }

    private fun calculateOverallResult(
        persons: List<IncomeValidatorPerson>,
        monthlyIncomeSum: BigDecimal,
    ): IncomeValidatorResult {
        var valid = false

        var limit = determineLimit(persons)

        val toleranceValue =
            incomeLimitRepository.findSingleValueOfType(type = IncomeLimitType.TOLERANCE, currentDate = LocalDate.now())
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
            amountExceededLimit = if (!valid) differenceFromLimit.abs() else BigDecimal.ZERO
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
            incomeLimitRepository.findLatestForPersonCount(
                currentDate = LocalDate.now(),
                countAdults = (countPersons - countAdditionalPersons),
                countChildren = (countChildren - countAdditionalChildren)
            )
        staticValueType?.let { overallLimit = overallLimit.add(it.amount ?: BigDecimal.ZERO) }

        val additionalAdultLimit =
            incomeLimitRepository.findSingleValueOfType(
                type = IncomeLimitType.ADDITIONAL_ADULT,
                currentDate = LocalDate.now()
            )?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit =
            incomeLimitRepository.findSingleValueOfType(
                type = IncomeLimitType.ADDITIONAL_CHILD,
                currentDate = LocalDate.now()
            )?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }

}
