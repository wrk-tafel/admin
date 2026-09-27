package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDate

@Entity(name = "RouteStopCompletion")
@Table(name = "routes_stops_completions")
@ExcludeFromTestCoverage
class RouteStopCompletionEntity(
    @ManyToOne
    @JoinColumn(name = "route_stop_id", nullable = false)
    var routeStop: RouteStopEntity,
    @Column(name = "completion_date")
    var completionDate: LocalDate,
) : BaseChangeTrackingEntity() {

    /** The account that ticked the stop off; empty once that account has been deleted. */
    @ManyToOne
    @JoinColumn(name = "completed_by_user_id", nullable = true)
    var completedBy: UserEntity? = null
}
