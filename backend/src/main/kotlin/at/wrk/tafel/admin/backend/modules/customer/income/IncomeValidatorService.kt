package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Period

interface IncomeValidatorService {
    fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult
}

@ExcludeFromTestCoverage
data class IncomeValidatorPerson(
    val monthlyIncome: BigDecimal? = null,
    val birthDate: LocalDate
) {
    fun isChild(): Boolean {
        return getAge() <= 24
    }

    fun getAge(): Int {
        return Period.between(birthDate, LocalDate.now()).years
    }
}

@ExcludeFromTestCoverage
data class IncomeValidatorResult(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal
)
