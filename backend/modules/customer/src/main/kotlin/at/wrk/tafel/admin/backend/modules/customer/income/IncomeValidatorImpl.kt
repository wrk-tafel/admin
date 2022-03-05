package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.entities.StaticValueType
import at.wrk.tafel.admin.backend.dbmodel.repositories.StaticValueRepository
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.math.max

class IncomeValidatorImpl(
    private val incomeLimitRepository: StaticValueRepository
) : IncomeValidator {

    private val TOLERANCE_VALUE = BigDecimal("100")

    override fun validate(persons: List<IncomeValidatorInputPerson>): Boolean {
        if (persons.isEmpty()) {
            throw IllegalArgumentException("No persons given")
        }

        var monthlySum = BigDecimal.ZERO
        for (person in persons) {
            monthlySum = monthlySum.add(person.monthlyIncome)
            monthlySum = monthlySum.add(calculateFamilyCredit(person))
        }

        return checkLimit(persons, monthlySum)
    }

    private fun calculateFamilyCredit(person: IncomeValidatorInputPerson): BigDecimal {
        var value = BigDecimal.ZERO
        if (person.age <= 24) {
            value = value.add(BigDecimal.ZERO) // TODO correct value
        }
        return value
    }

    private fun checkLimit(persons: List<IncomeValidatorInputPerson>, monthlySum: BigDecimal): Boolean {
        var valid = false

        val limit = determineLimit(persons).add(TOLERANCE_VALUE)
        val differenceFromLimit = limit.subtract(monthlySum)

        if (differenceFromLimit >= BigDecimal.ZERO) {
            valid = true
        }

        return valid
    }

    private fun determineLimit(persons: List<IncomeValidatorInputPerson>): BigDecimal {
        var overallLimit = BigDecimal.ZERO

        val countPersons = persons.count { !it.isChild() }
        val countChildren = persons.count { it.isChild() }
        val countAdditionalPersons = max(0, countPersons - 2)

        val childrenLimit = if (countPersons == 1) 2 else 3
        val countAdditionalChildren = max(0, countChildren - childrenLimit)

        val staticValueType = StaticValueType.valueOfCount((countPersons - countAdditionalPersons), countChildren)
        staticValueType?.let { overallLimit = overallLimit.add(getLimitValue(it)) }

        val additionalAdultLimit = getLimitValue(StaticValueType.ADDADULT)
        overallLimit = overallLimit.add(additionalAdultLimit.multiply(countAdditionalPersons.toBigDecimal()))

        val additionalChildrenLimit = getLimitValue(StaticValueType.ADDCHILD)
        overallLimit = overallLimit.add(additionalChildrenLimit.multiply(countAdditionalChildren.toBigDecimal()))

        return overallLimit
    }

    private fun getLimitValue(type: StaticValueType): BigDecimal {
        val incomeLimit = incomeLimitRepository.findByTypeAndDate(type.name, LocalDate.now())
        incomeLimit?.let { incomeLimit ->
            incomeLimit?.let {
                return it.value!!
            }
        }
        return BigDecimal.ZERO
    }
}
