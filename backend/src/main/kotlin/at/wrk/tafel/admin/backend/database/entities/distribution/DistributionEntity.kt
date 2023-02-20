package at.wrk.tafel.admin.backend.database.entities.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.ZonedDateTime

@Entity(name = "Distribution")
@Table(name = "distributions")
@ExcludeFromTestCoverage
class DistributionEntity : BaseChangeTrackingEntity() {

    @Column(name = "started_at")
    @CreationTimestamp
    var startedAt: ZonedDateTime? = null

    @Column(name = "ended_at")
    @UpdateTimestamp
    var endedAt: ZonedDateTime? = null

    @ManyToOne
    @JoinColumn(name = "startedby_userid", nullable = false)
    var startedByUser: UserEntity? = null

}
