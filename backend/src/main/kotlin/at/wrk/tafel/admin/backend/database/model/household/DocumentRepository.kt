package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface DocumentRepository : JpaRepository<DocumentEntity, Long> {

    fun findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId: Long): List<DocumentEntity>

    fun findByIdAndHouseholdHouseholdId(id: Long, householdId: Long): DocumentEntity?

    fun countByHouseholdIdIn(householdEntityIds: Collection<Long>): Int

    /**
     * Re-parents documents onto [targetHousehold] as part of a household merge (see
     * `HouseholdMergeService`). Unlike notes/distribution rows, `household_documents` files on disk
     * are untouched by this - only the DB row moves. Callers must remap `person` (via
     * [reassignPerson]) for any document whose person is a dropped duplicate *before* the source
     * household (and that person) is deleted, otherwise the FK's `on delete set null` silently drops
     * the person association instead of preserving it on the matched target person.
     *
     * @param sourceEntityIds `households.id` (entity primary keys) - never the business `householdId`.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Document d set d.household = :targetHousehold where d.household.id in :sourceEntityIds")
    fun reassignToHousehold(
        @Param("targetHousehold") targetHousehold: HouseholdEntity,
        @Param("sourceEntityIds") sourceEntityIds: Collection<Long>,
    ): Int

    /**
     * Remaps documents pointing at a dropped-duplicate source person onto the matched target person,
     * so the association survives the source person's deletion (see [reassignToHousehold]).
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Document d set d.person = :targetPerson where d.person.id = :sourcePersonId")
    fun reassignPerson(
        @Param("targetPerson") targetPerson: PersonEntity,
        @Param("sourcePersonId") sourcePersonId: Long,
    ): Int
}
