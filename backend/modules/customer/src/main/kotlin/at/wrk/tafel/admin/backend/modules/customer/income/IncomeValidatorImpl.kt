package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.entities.IncomeLimitType
import at.wrk.tafel.admin.backend.dbmodel.repositories.IncomeLimitRepository
import java.math.BigDecimal
import java.time.LocalDate

class IncomeValidatorImpl(
    private val incomeLimitRepository: IncomeLimitRepository
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

        return createResult(persons, monthlySum)
    }

    private fun calculateFamilyCredit(person: IncomeValidatorInputPerson): BigDecimal {
        var value = BigDecimal.ZERO
        if (person.age <= 24) {
            value = value.add(BigDecimal.ZERO) // TODO correct value
        }
        return value
    }

    private fun createResult(persons: List<IncomeValidatorInputPerson>, monthlySum: BigDecimal): Boolean {
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

        var countPersons = 0
        var countChildren = 0
        var countAdditionalPersons = 0
        var countAdditionalChildren = 0

        for (person in persons) {
            if (person.isChild()) {
                countChildren++
            } else {
                countPersons++
            }
        }

        if (countPersons > 2) {
            countAdditionalPersons = countPersons - 2
            countPersons = 2
        }
        if (countChildren > 3) {
            countAdditionalChildren = countChildren - 3
            countChildren = 3
        }

        val incomeLimitType = IncomeLimitType.valueOfCount(countPersons, countChildren)
        incomeLimitType?.let { incomeLimitTypeEnum ->
            val incomeLimit = incomeLimitRepository.findByTypeAndDate(incomeLimitTypeEnum.name, LocalDate.now())
            incomeLimit?.let { overallLimit = overallLimit.add(it.value) }
        }

        if (countAdditionalPersons > 0) {
            val incomeLimit = incomeLimitRepository.findByTypeAndDate(IncomeLimitType.ADDADULT.name, LocalDate.now())
            incomeLimit?.let { incomeLimit ->
                incomeLimit?.let {
                    overallLimit = overallLimit.add(it.value)
                }
            }
        }

        if (countAdditionalChildren > 0) {
            val incomeLimit = incomeLimitRepository.findByTypeAndDate(IncomeLimitType.ADDCHILD.name, LocalDate.now())
            incomeLimit?.let { incomeLimit ->
                incomeLimit?.let {
                    overallLimit = overallLimit.add(it.value)
                }
            }
        }

        return overallLimit
    }
}
