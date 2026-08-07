package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

@Entity(name = "Shelter")
@Table(name = "shelters")
@ExcludeFromTestCoverage
class ShelterEntity(
    @Column(name = "name")
    var name: String,
    @Column(name = "address_street")
    var addressStreet: String,
    @Column(name = "address_housenumber")
    var addressHouseNumber: String,
    @Column(name = "address_postalcode")
    var addressPostalCode: Int,
    @Column(name = "address_city")
    var addressCity: String,
    @Column(name = "persons_count")
    var personsCount: Int,
    @Column(name = "sort_order")
    var sortOrder: Int,
    @Column(name = "enabled")
    var enabled: Boolean = true,
) : BaseChangeTrackingEntity() {

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_door")
    var addressDoor: String? = null

    @Column(name = "note")
    var note: String? = null

    @OneToMany(mappedBy = "shelter", cascade = [CascadeType.ALL], orphanRemoval = true)
    var contacts: MutableList<ShelterContactEntity> = mutableListOf()
}
