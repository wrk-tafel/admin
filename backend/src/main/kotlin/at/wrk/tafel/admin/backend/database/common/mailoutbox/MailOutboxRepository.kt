package at.wrk.tafel.admin.backend.database.common.mailoutbox

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface MailOutboxRepository : JpaRepository<MailOutboxEntity, Long> {

    /**
     * The oldest mail that is due, locked against every other poller with `FOR UPDATE SKIP LOCKED`:
     * a row another instance is sending is skipped rather than waited for, so two pollers work
     * through the queue together instead of both delivering the same mail.
     *
     * The lock lasts as long as the caller's transaction, which is what makes it the guard for the
     * send itself - see [MailOutboxService.sendPendingMails]. Native, because neither `SKIP LOCKED`
     * nor a `LIMIT` on a locking query exists in JPQL.
     */
    @Query(
        value = """
            SELECT * FROM mail_outbox
            WHERE status = :status AND next_attempt_at <= :dueUntil
            ORDER BY id
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findNextDueForUpdateSkipLocked(
        @Param("status") status: String,
        @Param("dueUntil") dueUntil: LocalDateTime,
    ): MailOutboxEntity?

    @Transactional
    fun deleteAllByStatusAndSentAtBefore(status: MailOutboxStatus, sentAt: LocalDateTime)
}
