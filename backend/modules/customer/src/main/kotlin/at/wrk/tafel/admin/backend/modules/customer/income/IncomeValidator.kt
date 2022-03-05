package at.wrk.tafel.admin.backend.modules.customer.income

import java.math.BigDecimal

interface IncomeValidator {
    fun validate(input: IncomeValidatorInput): Boolean
}

data class IncomeValidatorInput(
    val persons: List<IncomeValidatorInputPerson> = listOf()
)

data class IncomeValidatorInputPerson(
    val monthlyIncome: BigDecimal,
    val age: Int,
    val compulsoryEducation: Boolean
)
