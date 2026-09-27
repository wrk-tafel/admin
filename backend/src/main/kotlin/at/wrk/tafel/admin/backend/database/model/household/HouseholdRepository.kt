package at.wrk.tafel.admin.backend.database.model.household

import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.time.LocalDateTime

interface HouseholdRepository :
    JpaRepository<HouseholdEntity, Long>,
    JpaSpecificationExecutor<HouseholdEntity> {

    /**
     * The human-facing `household_id` business number, drawn from a dedicated Postgres sequence -
     * distinct from the entity's own JPA-generated primary key.
     */
    @Query("SELECT nextval('household_id_sequence')", nativeQuery = true)
    fun getNextHouseholdSequenceValue(): Long

    /**
     * Overrides the inherited `findAll(Specification, Sort)` with an eager fetch of `persons`.
     * Without this, income-validating each household in
     * `HouseholdService.getHouseholdsAboveLimit()` would trigger one extra query per household -
     * that caller loads every valid household up front rather than a paginated slice, so the N+1
     * cost would otherwise be unbounded. An eager fetch is only safe here because the query is
     * unpaginated: a collection fetch combined with a `Pageable` would make Hibernate paginate in
     * memory over the whole result.
     */
    @EntityGraph(attributePaths = ["persons"])
    override fun findAll(spec: Specification<HouseholdEntity>, sort: Sort): List<HouseholdEntity>

    fun existsByHouseholdId(id: Long): Boolean

    fun getReferenceByHouseholdId(id: Long): HouseholdEntity

    fun findByHouseholdId(householdId: Long): HouseholdEntity?

    @EntityGraph(attributePaths = ["persons"])
    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    @EntityGraph(attributePaths = ["persons"])
    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<HouseholdEntity>

    /**
     * Ids only, not entities: the distribution statistic subtracts the households already counted as
     * new/prolonged from this set to avoid double-counting one that is both in the same window - a
     * plain `count` can't do that set difference. An explicit `select h.id` rather than a
     * `findIdBy...` derived-query projection, which - unlike `findExpiredHouseholdIdsSkipLocked`'s
     * native `SELECT household_id` - Spring Data does not treat as an id-only projection here: it
     * still executes as `select h from Household h ...` and then fails converting the fetched
     * `HouseholdEntity` rows to `Long` when postprocessing the declared `List<Long>` return type.
     */
    @Query("select h.id from Household h where h.updatedAt between :fromDate and :toDate")
    fun findIdByUpdatedAtBetween(@Param("fromDate") fromDate: LocalDateTime, @Param("toDate") toDate: LocalDateTime): List<Long>

    /**
     * Every household still entitled today and not locked - what the dashboard's "Kunden gesamt"
     * tile shows while no distribution is active. `date` is a parameter rather than `CURRENT_DATE`
     * baked into the query so the count stays testable with a fixed reference date.
     */
    fun countByLockedFalseAndValidUntilGreaterThanEqual(date: LocalDate): Int

    /**
     * Candidate ids for `HouseholdRetentionService` (GDPR gap G1) - the business `household_id` of
     * every household whose `validUntil` is further in the past than the configured retention
     * window, locked for the caller's transaction so a second instance's poll skips a household this
     * one is already deleting rather than racing it (see ADR-0047). Native and set-based because
     * `FOR UPDATE SKIP LOCKED` has no derived-query equivalent. Returns the business number rather
     * than the JPA primary key since that is what `HouseholdService.deleteHouseholdByHouseholdId`
     * takes.
     *
     * Excludes a household locked for [HouseholdLockReason.BANNED_FROM_PREMISES] (issue #3753) - kept
     * around for as long as that lock lasts, regardless of `validUntil`, so the record of a ban is
     * not lost to routine retention. Written as an explicit null check
     * (`lock_reason_type is null or <> ...`) rather than
     * `not (locked and lock_reason_type = 'BANNED_FROM_PREMISES')` - SQL's three-valued logic would
     * otherwise make that `not` evaluate to `null` (matching neither branch, so excluding the row
     * from deletion entirely) for a household locked with no reason type, e.g. one predating this
     * column.
     */
    @Query(
        value = """
            SELECT household_id FROM households
            WHERE valid_until < :cutoff
            AND (locked = false OR lock_reason_type IS NULL OR lock_reason_type <> 'BANNED_FROM_PREMISES')
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findExpiredHouseholdIdsSkipLocked(@Param("cutoff") cutoff: LocalDate): List<Long>

    /**
     * Candidate ids for [at.wrk.tafel.admin.backend.modules.household.internal.HouseholdLockExpiryService]
     * (issue #3753) - the business `household_id` of every household whose temporary lock
     * ([HouseholdEntity.lockedUntil]) has passed, locked for the caller's transaction the same way as
     * [findExpiredHouseholdIdsSkipLocked] (ADR-0047).
     */
    @Query(
        value = """
            SELECT household_id FROM households
            WHERE locked = true AND locked_until IS NOT NULL AND locked_until < :cutoff
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findHouseholdIdsWithExpiredLockSkipLocked(@Param("cutoff") cutoff: LocalDate): List<Long>

    /**
     * How many households `HouseholdRetentionService` will delete once their validity lies before
     * [cutoff] - the same measure as [findExpiredHouseholdIdsSkipLocked], including its
     * [HouseholdLockReason.BANNED_FROM_PREMISES] exclusion, as a plain count without the row locks
     * for the advance warning to administrators (`RetentionExpiryReminderService`). A Kotlin default
     * method rather than a bare `@Query` so the exclusion's enum value is a bound parameter, not a
     * JPQL enum literal - Hibernate's HQL parser here rejects a fully-qualified enum literal path
     * with `SemanticException: Could not interpret path expression`.
     */
    fun countByValidUntilBefore(cutoff: LocalDate): Long = countByValidUntilBeforeExcludingLockReason(cutoff, HouseholdLockReason.BANNED_FROM_PREMISES)

    @Query(
        """
            select count(h) from Household h
            where h.validUntil < :cutoff
            and (h.locked = false or h.lockReasonType is null or h.lockReasonType <> :exemptLockReason)
        """,
    )
    fun countByValidUntilBeforeExcludingLockReason(@Param("cutoff") cutoff: LocalDate, @Param("exemptLockReason") exemptLockReason: HouseholdLockReason): Long

    /**
     * The households behind [countByValidUntilBefore], oldest validity first, with their main person
     * loaded since the "Anstehende Löschungen" screen (`PendingDeletionsService`) names them. Split
     * into a default method plus a bound-parameter `@Query` for the same reason as
     * [countByValidUntilBefore].
     */
    fun findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(cutoff: LocalDate, pageable: Pageable): List<HouseholdEntity> = findAllByValidUntilBeforeExcludingLockReasonOrderByValidUntilAscIdAsc(cutoff, HouseholdLockReason.BANNED_FROM_PREMISES, pageable)

    @Query(
        """
            select h from Household h
            where h.validUntil < :cutoff
            and (h.locked = false or h.lockReasonType is null or h.lockReasonType <> :exemptLockReason)
            order by h.validUntil asc, h.id asc
        """,
    )
    @EntityGraph(attributePaths = ["mainPerson"])
    fun findAllByValidUntilBeforeExcludingLockReasonOrderByValidUntilAscIdAsc(
        @Param("cutoff") cutoff: LocalDate,
        @Param("exemptLockReason") exemptLockReason: HouseholdLockReason,
        pageable: Pageable,
    ): List<HouseholdEntity>
}
