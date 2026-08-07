package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalTime

@Entity(name = "RouteStop")
@Table(name = "routes_stops")
@ExcludeFromTestCoverage
class RouteStopEntity(
    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    var route: RouteEntity,
    @Column(name = "time")
    var time: LocalTime,
) : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "shop_id")
    var shop: ShopEntity? = null

    @Column(name = "description")
    var description: String? = null
}
