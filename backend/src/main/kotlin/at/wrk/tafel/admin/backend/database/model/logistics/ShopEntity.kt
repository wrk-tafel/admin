package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

@Entity(name = "Shop")
@Table(name = "shops")
@ExcludeFromTestCoverage
class ShopEntity(
    @Column(name = "number")
    var number: Int,
    @Column(name = "name")
    var name: String,
    @Embedded
    var address: ShopAddress,
    @Column(name = "food_unit")
    @Enumerated(EnumType.STRING)
    var foodUnit: FoodUnit = FoodUnit.BOX,
) : BaseChangeTrackingEntity() {

    @Column(name = "phone")
    var phone: String? = null

    @Column(name = "note")
    var note: String? = null

    @Column(name = "contact_person")
    var contactPerson: String? = null
}
