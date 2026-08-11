package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Period

fun interface IncomeValidatorService {
    fun validate(persons: List<IncomeValidatorPerson>): IncomeValidatorResult
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

    fun isChild(): Boolean = getAge() < CHILD_AGE_LIMIT

    fun isChildForFamilyAllowance(): Boolean = getAge() <= FAMILY_ALLOWANCE_CHILD_AGE_LIMIT

    fun getAge(): Int = Period.between(birthDate, LocalDate.now()).years
}

@ExcludeFromTestCoverage
data class IncomeValidatorResult(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal,
    val details: IncomeValidatorDetails = IncomeValidatorDetails(),
)

/**
 * The parts [IncomeValidatorResult.totalSum] and `limit` were added up from, so a user can be told
 * *why* a household is (not) eligible rather than just by how much. Every amount here is already
 * contained in one of those two totals - this carries no additional rule, only the split.
 *
 * `totalSum` is [incomeSum] + [familyAllowanceSum] + [childTaxAllowanceSum] + [siblingAdditionSum];
 * `limit` is [baseLimit] + [additionalAdultsSum] + [additionalChildrenSum] +
 * [IncomeValidatorResult.toleranceValue].
 */
@ExcludeFromTestCoverage
data class IncomeValidatorDetails(
    val incomeSum: BigDecimal = BigDecimal.ZERO,
    val familyAllowanceSum: BigDecimal = BigDecimal.ZERO,
    val childTaxAllowanceSum: BigDecimal = BigDecimal.ZERO,
    val siblingAdditionSum: BigDecimal = BigDecimal.ZERO,
    val baseLimit: BigDecimal = BigDecimal.ZERO,
    /** Adult/child count the [baseLimit] was looked up for - capped at the base household size. */
    val baseLimitCountAdults: Int = 0,
    val baseLimitCountChildren: Int = 0,
    /** Persons beyond the base household size, and what they added to the limit. */
    val additionalAdultsCount: Int = 0,
    val additionalAdultsSum: BigDecimal = BigDecimal.ZERO,
    val additionalChildrenCount: Int = 0,
    val additionalChildrenSum: BigDecimal = BigDecimal.ZERO,
)
