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

    /**
     * The unpaged counterpart to the paged overload above - every note for a household, not one
     * page of them. Used by [at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteService.getAllNotes]
     * for the GDPR data export (issue #3179), where a page-size cap would silently truncate the
     * record.
     */
    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId: Long): List<HouseholdNoteEntity>

    @Query("select count(n) from HouseholdNote n where n.household.id in :sourceEntityIds")
    fun countByHouseholdEntityIdIn(@Param("sourceEntityIds") sourceEntityIds: Collection<Long>): Int

    /**
     * Re-parents notes onto [targetHousehold] as part of a household merge (see
     * `HouseholdMergeService`). A bulk `@Modifying` update (rather than loading + saving entities) is
     * deliberate: touching `HouseholdEntity.notes` in memory - even just removing an element from a
     * source's collection - would schedule an orphan-removal DELETE for a row we're simultaneously
     * trying to keep, the same reasoning as `PersonRepository.reassignToHousehold`.
     * `clearAutomatically` detaches the persistence context so the source household is re-read fresh
     * (and genuinely childless) before it gets deleted.
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
