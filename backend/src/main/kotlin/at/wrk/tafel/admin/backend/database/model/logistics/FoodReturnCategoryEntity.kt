package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * A commonly used return box ("Kiste") that goes back to the shop. Unlike [FoodCategoryEntity] it
 * has no weight - return boxes are only ever counted, never weighed - and it is never referenced by
 * a food collection. It exists purely to pre-fill the recording screen's return section; what gets
 * recorded is a [FoodCollectionReturnItemEntity] carrying this category's [name] as its free-text
 * description.
 */
@Entity(name = "FoodReturnCategory")
@Table(name = "food_return_categories")
@ExcludeFromTestCoverage
class FoodReturnCategoryEntity(
    @Column(name = "name")
    var name: String,
    @Column(name = "sort_order")
    var sortOrder: Int,
    @Column(name = "enabled")
    var enabled: Boolean = true,
) : BaseChangeTrackingEntity()
