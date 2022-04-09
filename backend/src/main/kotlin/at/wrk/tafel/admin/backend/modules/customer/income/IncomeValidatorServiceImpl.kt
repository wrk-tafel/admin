package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.database.repositories.staticdata.*
import org.springframework.stereotype.Service
import java.math.BigDecimal
import kotlin.math.max

@Service
class IncomeValidatorServiceImpl(
    private val incomeLimitRepository: IncomeLimitRepository,
    private val incomeToleranceRepository: IncomeToleranceRepository,
    private val familyBonusRepository: FamilyBonusRepository,
    private val childTaxAllowanceRepository: ChildTaxAllowanceRepository,
    private val siblingAdditionRepository: SiblingAdditionRepository
) : IncomeValidatorService {

    override fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult {
        if (persons.isEmpty()) {
            throw IllegalArgumentException("No persons given")
        }

        var monthlySum = BigDecimal.ZERO
        for (person in persons) {
            monthlySum = monthlySum.add(person.monthlyIncome ?: BigDecimal.ZERO)

            if (person.isChild()) {
                monthlySum = monthlySum.add(getFamilyBonusForAge(person.age) ?: BigDecimal.ZERO)

                val childTaxAllowanceValue =
                    childTaxAllowanceRepository.findCurrentValue().map { it.amount }.orElse(BigDecimal.ZERO)!!
                monthlySum = monthlySum.add(childTaxAllowanceValue)
            }
        }

        monthlySum = monthlySum.add(calculateSiblingAddition(persons))
        return calculateResult(persons, monthlySum)
    }

    private fun calculateSiblingAddition(
        persons: List<IncomeValidatorPerson>
    ): BigDecimal {
        val countChild = persons.count { it.isChild() }

        var siblingAdditionValue: BigDecimal = if (countChild >= 7) {
            siblingAdditionRepository.findCurrentMaxAddition()
                .map { it.amount }
                .orElse(BigDecimal.ZERO)
                ?: BigDecimal.ZERO
        } else {
            siblingAdditionRepository.findCurrentValues()
                .asSequence()
                .filter { it.countChild == countChild }
                .firstOrNull()
                ?.amount
                ?: BigDecimal.ZERO
        }

        return siblingAdditionValue.multiply(countChild.toBigDecimal())
    }

    private fun getFamilyBonusForAge(age: Int): BigDecimal? {
        return familyBonusRepository.findCurrentValues()
            .asSequence()
            .sortedByDescending { it.age }
            .filter { it.age!! >= age }
            .map { it.amount }
            .firstOrNull()
    }

    private fun calculateResult(persons: List<IncomeValidatorPerson>, monthlySum: BigDecimal): IncomeValidatorResult {
        var valid = false

        var limit = determineLimit(persons)

        val toleranceValueOptional = incomeToleranceRepository.findCurrentValue()
        limit = limit.add(toleranceValueOptional.map { it.amount }.orElse(BigDecimal.ZERO))

        val differenceFromLimit = limit.subtract(monthlySum)
        if (differenceFromLimit >= BigDecimal.ZERO) {
            valid = true
        }

        return IncomeValidatorResult(
            valid = valid,
            totalSum = monthlySum,
            limit = limit,
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
                (countPersons - countAdditionalPersons),
                (countChildren - countAdditionalChildren)
            )
        staticValueType?.let { overallLimit = overallLimit.add(it.amount ?: BigDecimal.ZERO) }

        val additionalAdultLimit = incomeLimitRepository.findLatestAdditionalAdult()?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit = incomeLimitRepository.findLatestAdditionalChild()?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }
}
