package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.database.model.base.MailType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
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

    /**
     * Deletes the sent mails past their retention, skipping any row another instance already holds -
     * the same `SKIP LOCKED` claim [findNextDueForUpdateSkipLocked] uses, for the same reason: two
     * cleanups running at once share the work out instead of colliding over it, and whatever one
     * skips the next tick picks up. Native and set-based, because a derived `deleteAllBy...` loads
     * every matching entity and removes it one by one, which both costs a round trip per row and
     * makes a concurrent cleanup fail on the rows it no longer finds.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM mail_outbox
            WHERE id IN (
                SELECT id FROM mail_outbox
                WHERE status = :status AND sent_at < :sentAt
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByStatusAndSentAtBeforeSkipLocked(
        @Param("status") status: String,
        @Param("sentAt") sentAt: LocalDateTime,
    ): Int

    /**
     * For the mails that never made it out: they have no `sentAt`, so their retention is counted
     * from the moment they were queued. Claimed with `SKIP LOCKED` as above.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM mail_outbox
            WHERE id IN (
                SELECT id FROM mail_outbox
                WHERE status = :status AND created_at < :createdAt
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByStatusAndCreatedAtBeforeSkipLocked(
        @Param("status") status: String,
        @Param("createdAt") createdAt: LocalDateTime,
    ): Int

    /**
     * The most recently queued mail of one type - how it ended is what the e-mail settings screen
     * reports. Ordered by id rather than by `createdAt`: the mails of one distribution are queued
     * within the same moment, and the id is what still puts them in the order they were written in.
     */
    fun findFirstByMailTypeOrderByIdDesc(mailType: MailType): MailOutboxEntity?

    /**
     * The highest id in the queue, or `0` when it is empty - taken before an action that queues
     * mails so [countByIdGreaterThan] can say afterwards how many it queued.
     */
    @Query("SELECT COALESCE(MAX(mail.id), 0) FROM MailOutbox mail")
    fun findMaxId(): Long

    fun countByIdGreaterThan(id: Long): Long
}
