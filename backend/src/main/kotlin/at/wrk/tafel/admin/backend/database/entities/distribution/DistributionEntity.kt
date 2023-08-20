package at.wrk.tafel.admin.backend.database.entities.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import java.time.LocalDateTime


@Entity(name = "Distribution")
@Table(name = "distributions")
@ExcludeFromTestCoverage
class DistributionEntity : BaseChangeTrackingEntity() {

    @Column(name = "started_at", nullable = false)
    var startedAt: LocalDateTime? = null

    @Column(name = "ended_at")
    var endedAt: LocalDateTime? = null

    @ManyToOne
    @JoinColumn(name = "startedby_userid", nullable = false)
    var startedByUser: UserEntity? = null

    @ManyToOne
    @JoinColumn(name = "endedby_userid")
    var endedByUser: UserEntity? = null

    @OneToOne(mappedBy = "distribution")
    var statistic: DistributionStatisticEntity? = null

    @OneToMany(mappedBy = "distribution")
    var customers: List<DistributionCustomerEntity> = emptyList()

}
