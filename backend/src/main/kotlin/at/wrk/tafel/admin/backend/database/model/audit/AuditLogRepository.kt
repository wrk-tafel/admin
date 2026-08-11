package at.wrk.tafel.admin.backend.database.model.audit

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
