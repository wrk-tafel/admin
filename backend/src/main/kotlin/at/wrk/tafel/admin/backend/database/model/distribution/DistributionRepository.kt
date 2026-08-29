package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface DistributionRepository : JpaRepository<DistributionEntity, Long> {

    fun findFirstByEndedAtIsNullOrderByStartedAtDesc(): DistributionEntity?

    fun findFirstByEndedAtIsNotNullOrderByStartedAtDesc(): DistributionEntity?

    @Query("SELECT d from Distribution d where year(d.startedAt) = :year order by d.startedAt asc")
    fun getDistributionsForYear(@Param("year") year: Int): List<DistributionEntity>

    fun getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc(): List<DistributionEntity>

    /**
     * Each `mark*` below stamps a phase timestamp and answers whether *this* caller was the one that
     * set it: the `is null` condition means only the first update matches, so a return of 1 is the
     * one-and-only moment that phase was reached and 0 means someone got there first. Callers use
     * that to publish a phase event exactly once, without needing a lock and without re-firing when
     * a ticket is reopened or a check-in deleted and re-entered.
     *
     * These are bulk updates, so they bypass the persistence context - a [DistributionEntity]
     * already loaded in the same transaction will not show the new value.
     */
    @Modifying
    @Query("update Distribution d set d.checkinStartedAt = :timestamp where d.id = :id and d.checkinStartedAt is null")
    fun markCheckinStarted(@Param("id") id: Long, @Param("timestamp") timestamp: LocalDateTime): Int

    @Modifying
    @Query("update Distribution d set d.foodHandoutStartedAt = :timestamp where d.id = :id and d.foodHandoutStartedAt is null")
    fun markFoodHandoutStarted(@Param("id") id: Long, @Param("timestamp") timestamp: LocalDateTime): Int

    @Modifying
    @Query("update Distribution d set d.ticketsCompletedAt = :timestamp where d.id = :id and d.ticketsCompletedAt is null")
    fun markTicketsCompleted(@Param("id") id: Long, @Param("timestamp") timestamp: LocalDateTime): Int

    @Modifying
    @Query("update Distribution d set d.foodCollectionCompletedAt = :timestamp where d.id = :id and d.foodCollectionCompletedAt is null")
    fun markFoodCollectionCompleted(@Param("id") id: Long, @Param("timestamp") timestamp: LocalDateTime): Int
}

/**
 * There is no `active` boolean column - a distribution is "current" purely by data shape: the
 * still-open (`endedAt is null`) row with the latest `startedAt`. Only one distribution can ever be
 * open at a time; once it is closed, this returns null until a new one is created.
 *
 * Deliberately *not* the row with the highest id: `distributions_seq` increments by 50
 * (`R__00070_migrate_id_sequences.sql`) so each application instance holds its own id block, and two
 * instances interleave - an id ordering can therefore pick an already-ended distribution from one
 * instance's block over the actually-open one from another's.
 */
fun DistributionRepository.getCurrentDistribution(): DistributionEntity? = findFirstByEndedAtIsNullOrderByStartedAtDesc()
