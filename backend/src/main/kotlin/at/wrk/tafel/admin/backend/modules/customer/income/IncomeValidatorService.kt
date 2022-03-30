package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal

interface IncomeValidatorService {
    fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult
}

@ExcludeFromTestCoverage
data class IncomeValidatorPerson(
    val monthlyIncome: BigDecimal? = null,
    val age: Int
) {
    fun isChild(): Boolean {
        return age <= 24
    }
}

@ExcludeFromTestCoverage
data class IncomeValidatorResult(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val amountExceededLimit: BigDecimal
)
