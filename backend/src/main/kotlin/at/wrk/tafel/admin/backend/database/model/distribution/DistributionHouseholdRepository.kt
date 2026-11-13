package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface DistributionHouseholdRepository : JpaRepository<DistributionHouseholdEntity, Long> {

    fun countAllByDistributionId(distributionId: Long): Int

    fun findByDistributionId(distributionId: Long): List<DistributionHouseholdEntity>

    /**
     * The single-ticket reads and counts below are what the check-in desks, the ticket screen and the
     * dashboard ask for all day. They exist so those requests don't load `DistributionEntity.households`,
     * whose cost grows with the size of the day - that list is for the closing statistics, which do
     * need all of it.
     */
    fun findByDistributionIdAndTicketNumber(distributionId: Long, ticketNumber: Int): DistributionHouseholdEntity?

    /** @param householdId the business number (`HouseholdEntity.householdId`), not the primary key. */
    fun findByDistributionIdAndHouseholdHouseholdId(distributionId: Long, householdId: Long): DistributionHouseholdEntity?

    fun findFirstByDistributionIdAndProcessedFalseOrderByTicketNumberAsc(distributionId: Long): DistributionHouseholdEntity?

    fun findFirstByDistributionIdAndProcessedTrueOrderByTicketNumberDesc(distributionId: Long): DistributionHouseholdEntity?

    fun countByDistributionIdAndProcessedTrue(distributionId: Long): Int

    fun existsByDistributionIdAndProcessedFalse(distributionId: Long): Boolean

    /**
     * The persons of the distribution's households other than their main persons, leaving out the ones
     * excluded from their household - with one per household for the main person, that is the formula
     * `DistributionStatisticService` and the customer-list PDF use for "persons".
     */
    @Query(
        """
            select count(p) from DistributionHousehold dh
            join Person p on p.household = dh.household
            where dh.distribution.id = :distributionId and p.isMainPerson = false and p.excludeFromHousehold = false
        """,
    )
    fun countAdditionalPersons(@Param("distributionId") distributionId: Long): Long

    /**
     * The persons of the distribution's goodwill packages beyond one per package - the counterpart of
     * [countAdditionalPersons] for tickets without a household, so "one per ticket plus these" stays the
     * person count.
     */
    @Query(
        """
            select coalesce(sum(dh.goodwillPersonCount - 1), 0) from DistributionHousehold dh
            where dh.distribution.id = :distributionId and dh.goodwill = true
        """,
    )
    fun countGoodwillAdditionalPersons(@Param("distributionId") distributionId: Long): Long

    /**
     * @param householdEntityIds `households.id` (entity primary keys) - never the business
     * `householdId`. Used by `HouseholdMergeService` to gather every distribution-attendance row of
     * the target and its merge sources in one query, so same-distribution collisions (see
     * `uq_distributions_households`) can be resolved across the whole merge set before any
     * re-pointing happens.
     */
    @Query("select dh from DistributionHousehold dh join fetch dh.distribution where dh.household.id in :householdEntityIds")
    fun findAllByHouseholdEntityIds(@Param("householdEntityIds") householdEntityIds: Collection<Long>): List<DistributionHouseholdEntity>

    /**
     * Re-parents surviving (non-collided) distribution-attendance rows onto [targetHousehold] as
     * part of a household merge. Like `HouseholdNoteRepository.reassignToHousehold`, this entity has
     * no `mappedBy` back-reference on `HouseholdEntity`, so it's invisible to JPA cascade and would
     * otherwise be lost to the DB's `on delete cascade` when the source household is deleted. Callers
     * must have already resolved any `uq_distributions_households` collisions (see
     * `HouseholdMergeService`) - re-pointing a row into a distribution the target already has an
     * entry for would violate that constraint.
     *
     * @param ids `distributions_households.id` values to move.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update DistributionHousehold dh set dh.household = :targetHousehold where dh.id in :ids")
    fun reassignToHousehold(
        @Param("targetHousehold") targetHousehold: HouseholdEntity,
        @Param("ids") ids: Collection<Long>,
    ): Int

    /**
     * Deletes the ticket [id] if it is still unprocessed and reports whether it did, for
     * `DistributionService.deleteCurrentTicket`. A bulk delete rather than `delete(entity)` because
     * two requests deleting the same ticket at once both read the row: Postgres makes the second
     * one wait for the first to commit and then deletes nothing, which this reports as `0`, while
     * an entity delete would only find out at flush time and fail the whole transaction.
     */
    @Modifying
    @Query("delete from DistributionHousehold dh where dh.id = :id and dh.processed = false")
    fun deleteUnprocessed(@Param("id") id: Long): Int
}
