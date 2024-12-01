package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

@Entity(name = "Route")
@Table(name = "routes")
@ExcludeFromTestCoverage
class RouteEntity : BaseChangeTrackingEntity() {

    @Column(name = "number")
    var number: Double? = null

    @Column(name = "name")
    var name: String? = null

    @Column(name = "note")
    var note: String? = null

    @OneToMany(mappedBy = "route")
    var stops: List<RouteStopEntity> = emptyList()

}
