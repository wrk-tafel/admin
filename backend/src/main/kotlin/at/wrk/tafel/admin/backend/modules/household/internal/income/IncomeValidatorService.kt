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
     *
     * A household the validator rejects (see `IncomeValidatorServiceImpl.calculateLimit`) yields a
     * failed [Result] rather than aborting the run: a batch caller lists many households and must
     * not lose all of them to one whose composition has no configured limit. The failure carries
     * the reason, so the caller can log it against the household it belongs to.
     */
    fun validateAll(personsPerHousehold: List<List<IncomeValidatorPerson>>): List<Result<IncomeValidatorResult>>
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
