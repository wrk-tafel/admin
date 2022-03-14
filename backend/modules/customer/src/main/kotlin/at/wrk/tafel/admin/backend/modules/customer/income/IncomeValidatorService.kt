package at.wrk.tafel.admin.backend.modules.customer.income

import java.math.BigDecimal

interface IncomeValidatorService {
    fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult
}

data class IncomeValidatorPerson(
    val monthlyIncome: BigDecimal? = null,
    val age: Int,
    val compulsoryEducation: Boolean? = false
) {
    fun isChild(): Boolean {
        return age <= 24
    }
}

data class IncomeValidatorResult(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val amountExceededLimit: BigDecimal
)
