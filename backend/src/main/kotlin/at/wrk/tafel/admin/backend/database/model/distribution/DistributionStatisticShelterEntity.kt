package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "DistributionStatisticShelter")
@Table(name = "distributions_statistics_shelters")
@ExcludeFromTestCoverage
class DistributionStatisticShelterEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "distribution_statistic_id")
    var statistic: DistributionStatisticEntity? = null

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

    @Column(name = "persons_count")
    var personsCount: Int? = null

}
