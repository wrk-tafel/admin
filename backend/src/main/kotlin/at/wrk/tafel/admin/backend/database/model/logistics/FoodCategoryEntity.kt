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
class FoodCategoryEntity : BaseChangeTrackingEntity() {

    @Column(name = "name")
    var name: String? = null

    @Column(name = "weight_per_unit")
    var weightPerUnit: BigDecimal? = null

    @Column(name = "return_item")
    var returnItem: Boolean? = null

}
