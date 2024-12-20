package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Car")
@Table(name = "cars")
@ExcludeFromTestCoverage
class CarEntity : BaseChangeTrackingEntity() {

    @Column(name = "license_plate")
    var licensePlate: String? = null

    @Column(name = "name")
    var name: String? = null

}
