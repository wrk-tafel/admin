package at.wrk.tafel.admin.backend.modules.customer.income

import java.math.BigDecimal

class IncomeValidatorImpl : IncomeValidator {

    override fun validate(input: IncomeValidatorInput): Boolean {
        val valid = false

        var monthlySum = BigDecimal.ZERO
        for (person in input.persons) {
            monthlySum = monthlySum.add(person.monthlyIncome)
            monthlySum = monthlySum.add(calculateFamilyCredit(person))
        }

        return createResult(input, monthlySum)
    }

    private fun calculateFamilyCredit(person: IncomeValidatorInputPerson): BigDecimal {
        var value = BigDecimal.ZERO
        if (person.age <= 24) {
            value = value.add(BigDecimal.ZERO) // TODO correct value
        }
        return value
    }

    private fun createResult(input: IncomeValidatorInput, monthlySum: BigDecimal): Boolean {
        var valid = false

        val limit = determineLimit(input)
        val differenceFromLimit = limit.subtract(monthlySum)

        // tolerance range 100 €
        if (differenceFromLimit <= BigDecimal("100.00")) {
            valid = true
        }

        return valid
    }

    private fun determineLimit(input: IncomeValidatorInput): BigDecimal {
        // TODO impl
        return BigDecimal("1000")
    }
}
