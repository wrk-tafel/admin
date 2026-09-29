package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import java.time.LocalDateTime

/**
 * A return box that has no matching [FoodCategoryEntity] with `returnItem = true`, recorded with a
 * free-text [description] instead. Unlike [FoodCollectionItemEntity] it carries no category and
 * therefore no weight - return boxes are only ever counted and reported back to the shop, never
 * weighed.
 */
@Embeddable
@ExcludeFromTestCoverage
class FoodCollectionReturnItemEntity(
    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    var shop: ShopEntity,
    @Column(name = "description", nullable = false)
    var description: String,
    @Column(name = "amount")
    var amount: Int,
    /** When the box was confirmed as back at its shop - null while it still has to go. */
    @Column(name = "returned_at")
    var returnedAt: LocalDateTime? = null,
    @Column(name = "returned_by")
    var returnedBy: String? = null,
)
