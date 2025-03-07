package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "ShelterContact")
@Table(name = "shelters_contacts")
@ExcludeFromTestCoverage
class ShelterContactEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    var shelter: ShelterEntity? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "phone")
    var phone: String? = null

}
