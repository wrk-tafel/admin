package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.repositories.FamilyBonusRepository
import at.wrk.tafel.admin.backend.dbmodel.repositories.IncomeLimitRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import kotlin.math.max

@Service
class IncomeValidatorServiceImpl(
    private val incomeLimitRepository: IncomeLimitRepository,
    private val familyBonusRepository: FamilyBonusRepository
) : IncomeValidatorService {

    private val TOLERANCE_VALUE = BigDecimal("100")

    override fun validate(persons: List<IncomeValidatorPerson>): Boolean {
        if (persons.isEmpty()) {
            throw IllegalArgumentException("No persons given")
        }

        var monthlySum = BigDecimal.ZERO
        for (person in persons) {
            monthlySum = monthlySum.add(person.monthlyIncome)
            monthlySum = monthlySum.add(calculateFamilyBonus(person))
        }

        return checkLimit(persons, monthlySum)
    }

    private fun calculateFamilyBonus(person: IncomeValidatorPerson): BigDecimal {
        var value = BigDecimal.ZERO
        if (person.isChild()) {
            value = value.add(getFamilyBonusForAge(person.age))
        }
        return value
    }

    private fun getFamilyBonusForAge(age: Int): BigDecimal? {
        return familyBonusRepository.findCurrentValues()
            .asSequence()
            .sortedByDescending { it.age }
            .filter { it.age!! >= age }
            .map { it.value }
            .firstOrNull()
    }

    private fun checkLimit(persons: List<IncomeValidatorPerson>, monthlySum: BigDecimal): Boolean {
        var valid = false

        val limit = determineLimit(persons).add(TOLERANCE_VALUE)
        val differenceFromLimit = limit.subtract(monthlySum)

        if (differenceFromLimit >= BigDecimal.ZERO) {
            valid = true
        }

        return valid
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
        staticValueType?.let { overallLimit = overallLimit.add(it.value ?: BigDecimal.ZERO) }

        val additionalAdultLimit = incomeLimitRepository.findLatestAdditionalAdult()?.value ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit = incomeLimitRepository.findLatestAdditionalChild()?.value ?: BigDecimal.ZERO
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }
}
