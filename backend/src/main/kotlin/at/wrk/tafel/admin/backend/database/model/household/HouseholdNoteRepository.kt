package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface HouseholdNoteRepository : JpaRepository<HouseholdNoteEntity, Long> {

    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(
        householdId: Long,
        pageRequest: PageRequest,
    ): Page<HouseholdNoteEntity>

    @Query("select count(n) from HouseholdNote n where n.household.id in :sourceEntityIds")
    fun countByHouseholdEntityIdIn(@Param("sourceEntityIds") sourceEntityIds: Collection<Long>): Int

    /**
     * Re-parents notes onto [targetHousehold] as part of a household merge (see
     * `HouseholdMergeService`). `HouseholdNoteEntity.household` has no `mappedBy` back-reference on
     * `HouseholdEntity`, so notes are invisible to JPA cascade from the household side - without this,
     * they'd only ever be reachable via the DB's `on delete cascade`, i.e. destroyed along with the
     * source instead of preserved.
     *
     * @param sourceEntityIds `households.id` (entity primary keys) of the merged-away households -
     * never the business `householdId`.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update HouseholdNote n set n.household = :targetHousehold where n.household.id in :sourceEntityIds")
    fun reassignToHousehold(
        @Param("targetHousehold") targetHousehold: HouseholdEntity,
        @Param("sourceEntityIds") sourceEntityIds: Collection<Long>,
    ): Int
}
