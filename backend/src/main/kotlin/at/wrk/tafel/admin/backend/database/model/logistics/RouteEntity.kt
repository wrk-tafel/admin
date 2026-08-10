package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import java.time.LocalDate

@Entity(name = "Route")
@Table(name = "routes")
@ExcludeFromTestCoverage
class RouteEntity(
    @Column(name = "number")
    var number: Double,
    @Column(name = "name")
    var name: String,
    @Column(name = "enabled")
    var enabled: Boolean = true,
) : BaseChangeTrackingEntity() {

    @Column(name = "note")
    var note: String? = null

    /**
     * The day this route's "driver is at the last stop" notification was sent - written only by
     * [RouteRepository.markLastStopNotified], which is what keeps that notification to one per
     * route per day.
     */
    @Column(name = "last_stop_notified_date")
    var lastStopNotifiedDate: LocalDate? = null

    @OneToMany(mappedBy = "route", cascade = [CascadeType.ALL], orphanRemoval = true)
    var stops: MutableList<RouteStopEntity> = mutableListOf()
}
