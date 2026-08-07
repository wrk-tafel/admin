package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity(name = "FoodCategory")
@Table(name = "food_categories")
@ExcludeFromTestCoverage
class FoodCategoryEntity(
    @Column(name = "name")
    var name: String,
    @Column(name = "sort_order")
    var sortOrder: Int,
    @Column(name = "enabled")
    var enabled: Boolean = true,
) : BaseChangeTrackingEntity() {

    @Column(name = "weight_per_unit")
    var weightPerUnit: BigDecimal? = null
}
