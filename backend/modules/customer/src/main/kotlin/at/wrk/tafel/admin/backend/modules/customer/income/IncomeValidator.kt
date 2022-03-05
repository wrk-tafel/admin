package at.wrk.tafel.admin.backend.modules.customer.income

import java.math.BigDecimal

interface IncomeValidator {
    fun validate(persons: List<IncomeValidatorPerson>): Boolean
}

data class IncomeValidatorPerson(
    val monthlyIncome: BigDecimal,
    val age: Int,
    val compulsoryEducation: Boolean? = false
) {
    fun isChild(): Boolean {
        return age <= 24 // TODO correct?
    }
}
