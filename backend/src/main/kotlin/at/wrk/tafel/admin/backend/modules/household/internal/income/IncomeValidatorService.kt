package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Period

interface IncomeValidatorService {
    /** Validates one household against the values in effect today. */
    fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult

    /**
     * Validates many households against **one** [IncomeRateCard], so every result - one per entry of
     * [personsPerHousehold], in the same order - is measured against the same limits and the same
     * date, even when an administrator edits a value while the run is in progress.
     */
    fun validateAll(personsPerHousehold: List<List<IncomeValidatorPerson>>): List<IncomeValidatorResult>
}

@ExcludeFromTestCoverage
data class IncomeValidatorPerson(
    val monthlyIncome: BigDecimal? = null,
    val birthDate: LocalDate?,
    val excludeFromIncomeCalculation: Boolean = false,
    val receivesFamilyAllowance: Boolean = false,
) {
    companion object {
        private const val CHILD_AGE_LIMIT = 15
        private const val FAMILY_ALLOWANCE_CHILD_AGE_LIMIT = 24
    }

    fun isChild(referenceDate: LocalDate): Boolean = getAge(referenceDate) < CHILD_AGE_LIMIT

    fun isChildForFamilyAllowance(referenceDate: LocalDate): Boolean = getAge(referenceDate) <= FAMILY_ALLOWANCE_CHILD_AGE_LIMIT

    fun getAge(referenceDate: LocalDate): Int = Period.between(birthDate, referenceDate).years
}

@ExcludeFromTestCoverage
data class IncomeValidatorResult(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal,
)
