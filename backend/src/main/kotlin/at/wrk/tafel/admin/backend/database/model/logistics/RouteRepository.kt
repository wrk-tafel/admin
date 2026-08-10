package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface RouteRepository : JpaRepository<RouteEntity, Long> {
    fun findByEnabledIsTrue(): List<RouteEntity>

    /**
     * Claims the right to announce that this route has reached its last stop today, and returns 1
     * when the claim was granted - a caller that gets 0 must stay silent, someone else already said
     * it. Written as a conditional update rather than a read-then-write so the claim is atomic, the
     * same guard `DistributionRepository.markFoodCollectionCompleted` uses.
     *
     * A bulk update, so it bypasses Hibernate's flush events - it neither stamps the
     * change-tracking columns nor reaches the audit listener, and needs neither: `routes` is not an
     * audited entity, and this column is a delivery marker rather than a change to the route.
     */
    @Modifying
    @Query(
        "update Route r set r.lastStopNotifiedDate = :date " +
            "where r.id = :id and (r.lastStopNotifiedDate is null or r.lastStopNotifiedDate <> :date)",
    )
    fun markLastStopNotified(@Param("id") id: Long, @Param("date") date: LocalDate): Int
}
