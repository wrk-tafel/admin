package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "ShelterContact")
@Table(name = "shelters_contacts")
@ExcludeFromTestCoverage
class ShelterContactEntity(
    @ManyToOne
    @JoinColumn(nullable = false)
    var shelter: ShelterEntity,
    @Column(name = "phone")
    var phone: String,
) : BaseChangeTrackingEntity() {

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null
}
