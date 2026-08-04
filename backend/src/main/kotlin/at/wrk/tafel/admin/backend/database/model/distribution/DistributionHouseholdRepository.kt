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
}
