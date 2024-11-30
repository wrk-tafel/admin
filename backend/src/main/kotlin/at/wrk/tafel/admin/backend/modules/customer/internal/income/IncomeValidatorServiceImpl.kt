package at.wrk.tafel.admin.backend.modules.customer.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.ChildTaxAllowanceRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.FamilyBonusRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeLimitRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeToleranceRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.SiblingAdditionRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
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

                val childTaxAllowanceValue = childTaxAllowanceRepository.findCurrentValue(LocalDate.now())
                    .map { it.amount }
                    .orElse(BigDecimal.ZERO)!!
                monthlySum += childTaxAllowanceValue
            }

            monthlySum
        }

        monthlySum += calculateSiblingAddition(persons)
        return monthlySum
    }

    private fun calculateSiblingAddition(
        persons: List<IncomeValidatorPerson>
    ): BigDecimal {
        val countChild = persons.count { it.isChildForFamilyBonus() }

        var siblingAdditionValue: BigDecimal = if (countChild >= 7) {
            siblingAdditionRepository.findCurrentMaxAddition(LocalDate.now())
                .map { it.amount }
                .orElse(BigDecimal.ZERO)
                ?: BigDecimal.ZERO
        } else {
            siblingAdditionRepository.findCurrentValues(LocalDate.now())
                .asSequence()
                .filter { it.countChild == countChild }
                .firstOrNull()
                ?.amount
                ?: BigDecimal.ZERO
        }

        return siblingAdditionValue.multiply(countChild.toBigDecimal())
    }

    private fun getFamilyBonusForAge(age: Int): BigDecimal? {
        return familyBonusRepository.findCurrentValues(LocalDate.now())
            .asSequence()
            .sortedByDescending { it.age }
            .filter { it.age!! >= age }
            .map { it.amount }
            .firstOrNull()
    }

    private fun calculateOverallResult(
        persons: List<IncomeValidatorPerson>,
        monthlyIncomeSum: BigDecimal
    ): IncomeValidatorResult {
        var valid = false

        var limit = determineLimit(persons)

        val toleranceValueOptional = incomeToleranceRepository.findCurrentValue(LocalDate.now())
        limit = limit.add(toleranceValueOptional.map { it.amount }.orElse(BigDecimal.ZERO))

        val differenceFromLimit = limit.subtract(monthlyIncomeSum)
        if (differenceFromLimit >= BigDecimal.ZERO) {
            valid = true
        }

        return IncomeValidatorResult(
            valid = valid,
            totalSum = monthlyIncomeSum,
            limit = limit,
            toleranceValue = toleranceValueOptional.map { it.amount }.orElse(BigDecimal.ZERO)!!,
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
                LocalDate.now(),
                (countPersons - countAdditionalPersons),
                (countChildren - countAdditionalChildren)
            )
        staticValueType?.let { overallLimit = overallLimit.add(it.amount ?: BigDecimal.ZERO) }

        val additionalAdultLimit =
            incomeLimitRepository.findLatestAdditionalAdult(LocalDate.now())?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit =
            incomeLimitRepository.findLatestAdditionalChild(LocalDate.now())?.amount ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }

}
