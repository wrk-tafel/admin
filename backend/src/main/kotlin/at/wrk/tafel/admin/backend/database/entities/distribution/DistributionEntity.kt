package at.wrk.tafel.admin.backend.database.entities.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*
import java.time.ZonedDateTime

@Entity(name = "Distribution")
@Table(name = "distributions")
@ExcludeFromTestCoverage
class DistributionEntity : BaseChangeTrackingEntity() {

    @Column(name = "started_at", nullable = false)
    var startedAt: ZonedDateTime? = null

    @Column(name = "ended_at")
    var endedAt: ZonedDateTime? = null

    @ManyToOne
    @JoinColumn(name = "startedby_userid", nullable = false)
    var startedByUser: UserEntity? = null

    @ManyToOne
    @JoinColumn(name = "endedby_userid")
    var endedByUser: UserEntity? = null

    @Column(name = "state")
    @Enumerated(value = EnumType.STRING)
    var state: DistributionState? = null

    @OneToMany(mappedBy = "distribution")
    var customers: List<DistributionCustomerEntity> = emptyList()

}
