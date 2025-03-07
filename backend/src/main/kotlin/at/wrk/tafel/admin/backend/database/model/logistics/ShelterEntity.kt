package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

@Entity(name = "Shelter")
@Table(name = "shelters")
@ExcludeFromTestCoverage
class ShelterEntity : BaseChangeTrackingEntity() {

    @Column(name = "name")
    var name: String? = null

    @Column(name = "address_street")
    var addressStreet: String? = null

    @Column(name = "address_housenumber")
    var addressHouseNumber: String? = null

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_postalcode")
    var addressPostalCode: Int? = null

    @Column(name = "address_city")
    var addressCity: String? = null

    @Column(name = "address_door")
    var addressDoor: String? = null

    @Column(name = "note")
    var note: String? = null

    @OneToMany(mappedBy = "shelter")
    var contacts: List<ShelterContactEntity> = emptyList()

    @Column(name = "persons_count")
    var personsCount: Int? = null

}
