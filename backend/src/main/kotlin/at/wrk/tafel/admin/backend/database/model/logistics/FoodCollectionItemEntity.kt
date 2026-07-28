package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import java.math.BigDecimal

@Embeddable
@ExcludeFromTestCoverage
class FoodCollectionItemEntity {

    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    var shop: ShopEntity? = null

    @ManyToOne
    @JoinColumn(name = "food_category_id", nullable = false)
    var category: FoodCategoryEntity? = null

    @Column(name = "amount")
    var amount: Int? = null

    /**
     * If the shop's [FoodUnit] is `KG`, `amount` already *is* the weight; otherwise the weight is
     * derived as `amount * category.weightPerUnit` (e.g. boxes of a known per-box weight). Get the
     * shop's unit wrong and every weight-based report/statistic derived from this collection is
     * wrong too.
     */
    fun calculateWeight(): BigDecimal {
        val amount = amount ?: 0
        val unit = shop?.foodUnit ?: FoodUnit.BOX

        return if (unit == FoodUnit.KG) {
            BigDecimal(amount)
        } else {
            val weightPerUnit = category?.weightPerUnit ?: BigDecimal.ZERO
            BigDecimal(amount) * weightPerUnit
        }
    }
}
