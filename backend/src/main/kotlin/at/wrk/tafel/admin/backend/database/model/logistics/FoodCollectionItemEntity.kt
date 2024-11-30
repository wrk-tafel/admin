package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne

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

}
