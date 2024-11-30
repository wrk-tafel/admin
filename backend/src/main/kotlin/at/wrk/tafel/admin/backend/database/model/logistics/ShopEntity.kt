package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Shop")
@Table(name = "shops")
@ExcludeFromTestCoverage
class ShopEntity : BaseChangeTrackingEntity() {

    @Column(name = "number")
    var number: Int? = null

    @Column(name = "name")
    var name: String? = null

    @Embedded
    var address: ShopAddress? = null

    @Column(name = "phone")
    var phone: String? = null

    @Column(name = "note")
    var note: String? = null

    @Column(name = "contact_person")
    var contactPerson: String? = null

}
