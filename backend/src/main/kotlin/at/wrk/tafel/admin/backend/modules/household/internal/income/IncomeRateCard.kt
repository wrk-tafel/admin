package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import java.math.BigDecimal
import java.time.LocalDate

/**
 * The static values in effect on [referenceDate] - the income limits, allowances and the tolerance
 * that income validation resolves every one of its lookups against.
 *
 * `static_values` is a versioned rate card: every row carries a `[validFrom, validTo]` window, so
 * "the values in effect on date D" is a single snapshot of a few dozen rows. Reading that snapshot
 * once per validation run and answering from memory replaces a query per lookup, and makes a run
 * internally consistent - an amount edited while a run is in progress cannot apply to half of its
 * results, and a run crossing midnight resolves against one date. See ADR-0048.
 *
 * A lookup with no matching row answers [BigDecimal.ZERO]: `static_values` is admin-maintained and
 * a validation must still produce a number when a value has not been configured.
 */
class IncomeRateCard(
    val referenceDate: LocalDate,
    values: List<StaticValueEntity>,
) {

    companion object {
        // Sibling addition (Geschwisterstaffel) tiers stop increasing beyond this many children -
        // the highest configured tier is used for any larger count.
        private const val SIBLING_ADDITION_MAX_TIER_CHILDREN = 7
    }

    private val ratesByType: Map<StaticValueType, List<Rate>> = values.groupBy(
        keySelector = { it.type },
        valueTransform = { Rate(amount = it.amount, countAdults = it.countAdults, countChildren = it.countChildren, age = it.age) },
    )

    /**
     * Base limit for a household of exactly this composition - the caller reduces larger households
     * to a configured composition first and tops the result up with [additionalAdultLimit] /
     * [additionalChildLimit].
     */
    fun incomeLimit(countAdults: Int, countChildren: Int): BigDecimal = ratesOf(StaticValueType.INCOME_LIMIT)
        .firstOrNull { it.countAdults == countAdults && it.countChildren == countChildren }
        ?.amount ?: BigDecimal.ZERO

    fun additionalAdultLimit(): BigDecimal = singleAmount(StaticValueType.ADDITIONAL_ADULT)

    fun additionalChildLimit(): BigDecimal = singleAmount(StaticValueType.ADDITIONAL_CHILD)

    fun tolerance(): BigDecimal = singleAmount(StaticValueType.TOLERANCE)

    /** Kinderabsetzbetrag - a flat amount per child, independent of age. */
    fun childTaxAllowance(): BigDecimal = singleAmount(StaticValueType.CHILD_TAX_ALLOWANCE)

    /**
     * Familienbeihilfe for a child of [age]. A tier's own `age` is the *lower* bound of a "from age
     * X" bracket, so the applicable tier is the highest one whose age the child has already reached
     * - a 1-year-old gets the `age = 0` tier, a 20-year-old the `age = 19` one. Zero when no tier
     * covers the age at all, i.e. the child is younger than the lowest configured tier.
     */
    fun familyAllowanceForAge(age: Int): BigDecimal = ratesOf(StaticValueType.FAMILY_ALLOWANCE)
        .sortedByDescending { it.age }
        .firstOrNull { (it.age ?: 0) <= age }
        ?.amount ?: BigDecimal.ZERO

    /** Geschwisterstaffel - the amount added *per child* in a household with [countChildren] children. */
    fun siblingAdditionPerChild(countChildren: Int): BigDecimal {
        val tiers = ratesOf(StaticValueType.SIBLING_ADDITION)

        return if (countChildren >= SIBLING_ADDITION_MAX_TIER_CHILDREN) {
            tiers.maxByOrNull { it.countChildren ?: 0 }?.amount
        } else {
            tiers.firstOrNull { it.countChildren == countChildren }?.amount
        } ?: BigDecimal.ZERO
    }

    private fun singleAmount(type: StaticValueType): BigDecimal = ratesOf(type).firstOrNull()?.amount ?: BigDecimal.ZERO

    private fun ratesOf(type: StaticValueType): List<Rate> = ratesByType[type].orEmpty()

    private data class Rate(
        val amount: BigDecimal,
        val countAdults: Int?,
        val countChildren: Int?,
        val age: Int?,
    )
}
