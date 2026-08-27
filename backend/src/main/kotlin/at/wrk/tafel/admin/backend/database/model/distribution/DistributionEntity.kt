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
class DistributionEntity(
    @Column(name = "started_at", nullable = false)
    var startedAt: LocalDateTime,
    // Always set at creation (DistributionService.startDistribution requires an authenticated
    // user) but nullable at the DB level with `on delete set null`
    // (R__00027_user_distributions_fk_cascade.sql) - a since-deleted account clears this, the same
    // as endedByUser below, so callers must not assume it stays non-null forever.
    @ManyToOne
    @JoinColumn(name = "startedby_userid")
    var startedByUser: UserEntity?,
) : BaseChangeTrackingEntity() {

    @Column(name = "ended_at")
    var endedAt: LocalDateTime? = null

    /**
     * When each phase of the day was first reached. Null means "not yet" - including for every
     * distribution that predates these columns. Never written directly through this entity: the
     * `DistributionRepository.mark*` methods set them with a conditional UPDATE so the first writer
     * wins, which is what makes the matching phase notifications fire exactly once (see
     * `modules.push`). Because those are bulk updates, an entity already loaded in the persistence
     * context keeps its stale null until refreshed - fine, since nothing reads these back in the
     * same transaction that sets them.
     */
    @Column(name = "checkin_started_at")
    var checkinStartedAt: LocalDateTime? = null

    @Column(name = "food_handout_started_at")
    var foodHandoutStartedAt: LocalDateTime? = null

    @Column(name = "tickets_completed_at")
    var ticketsCompletedAt: LocalDateTime? = null

    @Column(name = "food_collection_completed_at")
    var foodCollectionCompletedAt: LocalDateTime? = null

    @Column(name = "notes")
    var notes: String? = null

    @ManyToOne
    @JoinColumn(name = "endedby_userid")
    var endedByUser: UserEntity? = null

    @OneToOne(mappedBy = "distribution", cascade = [CascadeType.ALL])
    var statistic: DistributionStatisticEntity? = null

    @OneToMany(mappedBy = "distribution")
    var households: List<DistributionHouseholdEntity> = emptyList()

    @OneToMany(mappedBy = "distribution")
    var foodCollections: List<FoodCollectionEntity> = emptyList()
}
