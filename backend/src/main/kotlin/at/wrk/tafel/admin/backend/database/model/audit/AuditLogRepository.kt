package at.wrk.tafel.admin.backend.database.model.audit

import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface AuditLogRepository :
    JpaRepository<AuditLogEntity, Long>,
    JpaSpecificationExecutor<AuditLogEntity> {

    /**
     * The per-household "Verlauf" tab. Filtered on [entityTypes] as well as the business key because
     * a household number and a username are both stored in `business_key` - the type set is what
     * keeps a user called "1234" out of household 1234's history.
     */
    fun findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
        businessKey: String,
        entityTypes: Collection<String>,
        pageable: Pageable,
    ): Page<AuditLogEntity>

    /**
     * Every user the log actually holds an entry for, for the administration screen's actor filter.
     * Read from the log rather than from `users` on purpose: the filter matches `actor_username`,
     * so an account that never changed anything would be an option that can only ever return
     * nothing, and an account since deleted still has to be offered as long as its entries are here.
     *
     * A user whose recorded name changed within the retention window yields one row per spelling -
     * `AuditService` keeps the first. Scanning the whole log for this is bounded by that same
     * retention window and happens once, when the screen opens.
     */
    @Query(
        """
            SELECT DISTINCT a.actorUsername AS username, a.actorFirstname AS firstname, a.actorLastname AS lastname
            FROM AuditLog a
            WHERE a.actorUsername IS NOT NULL
            ORDER BY a.actorUsername ASC
        """,
    )
    fun findDistinctActors(): List<AuditActorProjection>

    /**
     * Drops the entries past their retention, skipping any row another instance already holds, and
     * returns how many this call actually removed - so two instances cleaning up at once report
     * what each of them did rather than both claiming the whole batch. Native and set-based,
     * because a derived `deleteAllBy...` loads every matching entity and removes it one by one,
     * which costs a round trip per row and fails outright on the rows a concurrent cleanup already
     * deleted - on a log this size, the difference is thousands of round trips.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM audit_log
            WHERE id IN (
                SELECT id FROM audit_log
                WHERE occurred_at < :cutoff
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByOccurredAtBeforeSkipLocked(@Param("cutoff") cutoff: LocalDateTime): Int

    /**
     * A preview of what [deleteAllByOccurredAtBeforeSkipLocked] would delete this run, for
     * `AuditRetentionService`'s ceiling check (GDPR gap G18) - a plain count rather than a locking
     * `SELECT ... FOR UPDATE`, since it only has to decide whether to proceed, not claim rows. A
     * concurrent instance may delete some of what this counted before the delete itself runs, which
     * only ever makes the actual run smaller than this preview, never larger - the ceiling this
     * guards is a sanity bound, not a precise quota.
     */
    fun countByOccurredAtBefore(cutoff: LocalDateTime): Long

    /**
     * Who read more than [threshold] entries of [operation] since [since] - the query behind GDPR
     * gap G11's breach-detection threshold (`ExcessiveReadAccessDetectionService`). Grouped rather
     * than fetched row-by-row: a session downloading hundreds of documents in an hour must cost one
     * query here, not one row loaded per document.
     */
    @Query(
        """
            SELECT a.actorUsername AS username, COUNT(a) AS readCount
            FROM AuditLog a
            WHERE a.operation = :operation
              AND a.actorUsername IS NOT NULL
              AND a.occurredAt >= :since
            GROUP BY a.actorUsername
            HAVING COUNT(a) > :threshold
        """,
    )
    fun findActorsWithOperationCountAbove(
        @Param("operation") operation: AuditOperation,
        @Param("since") since: LocalDateTime,
        @Param("threshold") threshold: Long,
    ): List<AuditActorOperationCountProjection>

    /**
     * Whether [actorUsername] already has a recorded [operation] of [entityType]/[businessKey] since
     * [since] - lets a caller de-duplicate a read (e.g. `HouseholdService.findByHouseholdId`) so a
     * screen reload within the dedupe window doesn't count as a fresh one for breach detection
     * (`ExcessiveReadAccessDetectionService`, see issue #3430).
     */
    fun existsByEntityTypeAndBusinessKeyAndOperationAndActorUsernameAndOccurredAtAfter(
        entityType: String,
        businessKey: String,
        operation: AuditOperation,
        actorUsername: String,
        since: LocalDateTime,
    ): Boolean
}

/**
 * One acting user as [AuditLogRepository.findDistinctActors] reads them. The name parts are
 * nullable for the same reasons they are on the entity - entries written before those columns
 * existed, and accounts with no employee behind them.
 */
interface AuditActorProjection {
    val username: String
    val firstname: String?
    val lastname: String?
}

/** One actor's tally, as [AuditLogRepository.findActorsWithOperationCountAbove] reads them. */
interface AuditActorOperationCountProjection {
    val username: String
    val readCount: Long
}
