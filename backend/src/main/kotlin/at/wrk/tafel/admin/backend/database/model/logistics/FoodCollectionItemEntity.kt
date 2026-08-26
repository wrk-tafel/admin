package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import java.math.BigDecimal

@Embeddable
@ExcludeFromTestCoverage
class FoodCollectionItemEntity(
    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    var shop: ShopEntity,
    @ManyToOne
    @JoinColumn(name = "food_category_id", nullable = false)
    var category: FoodCategoryEntity,
    amount: Int,
) {

    @Column(name = "amount")
    final var amount: Int = amount
        private set

    /**
     * The weight this item contributed **when it was recorded**, stored rather than derived on read:
     * the shop's [FoodUnit] and the category's `weightPerUnit` are editable master data, so
     * recomputing from them would retroactively change the kg reported for distributions that are
     * already closed - `distributions_statistics.food_total_amount` is frozen at close time, and the
     * TOeT_Spenden export would no longer agree with it.
     */
    @Column(name = "weight", nullable = false)
    final var weight: BigDecimal = calculateWeight(shop, category, amount)
        private set

    /**
     * The shop's number at the time this item was recorded, stored the same way [weight] is: `shop`
     * is only ever set once (at construction, never reassigned), but its `number` is editable master
     * data - reading it live would retroactively rewrite the "Spender" column of the TOeT_Spenden
     * export for past distributions whenever a shop's number changes.
     */
    @Column(name = "shop_number", nullable = false)
    final var shopNumber: Int = shop.number
        private set

    /**
     * The category's name at the time this item was recorded - same reasoning as [shopNumber], for
     * the TOeT_Spenden export's per-category columns.
     */
    @Column(name = "category_name", nullable = false)
    final var categoryName: String = category.name
        private set

    /**
     * The only way to change the amount, so the stored [weight] can never fall out of sync with it.
     */
    fun updateAmount(newAmount: Int) {
        amount = newAmount
        weight = calculateWeight(shop, category, newAmount)
    }

    companion object {
        /**
         * If the shop's [FoodUnit] is `KG`, `amount` already *is* the weight; otherwise the weight is
         * derived as `amount * category.weightPerUnit` (e.g. boxes of a known per-box weight). Get the
         * shop's unit wrong and every weight-based report/statistic derived from this collection is
         * wrong too.
         */
        private fun calculateWeight(
            shop: ShopEntity,
            category: FoodCategoryEntity,
            amount: Int,
        ): BigDecimal = if (shop.foodUnit == FoodUnit.KG) {
            BigDecimal(amount)
        } else {
            val weightPerUnit = category.weightPerUnit ?: BigDecimal.ZERO
            BigDecimal(amount) * weightPerUnit
        }
    }
}
