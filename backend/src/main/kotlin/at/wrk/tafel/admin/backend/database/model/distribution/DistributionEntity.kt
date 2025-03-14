package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import jakarta.persistence.CascadeType
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

    @Column(name = "notes")
    var notes: String? = null

    @ManyToOne
    @JoinColumn(name = "startedby_userid", nullable = false)
    var startedByUser: UserEntity? = null

    @ManyToOne
    @JoinColumn(name = "endedby_userid")
    var endedByUser: UserEntity? = null

    @OneToOne(mappedBy = "distribution", cascade = [CascadeType.ALL])
    var statistic: DistributionStatisticEntity? = null

    @OneToMany(mappedBy = "distribution")
    var customers: List<DistributionCustomerEntity> = emptyList()

    @OneToMany(mappedBy = "distribution")
    var foodCollections: List<FoodCollectionEntity> = emptyList()

}
