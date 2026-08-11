package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface SseOutboxRepository : JpaRepository<SseOutboxEntity, Long> {

    /**
     * Drops the events past their retention, skipping any row another instance already holds. A
     * second instance's cleanup then shares the work out rather than colliding over it, and
     * whatever it skips the next tick picks up - the same `SKIP LOCKED` claim the mail outbox uses
     * to let two pollers drain one queue. Native and set-based, because a derived `deleteAllBy...`
     * loads every matching entity and removes it one by one, which costs a round trip per row and
     * fails outright on the rows a concurrent cleanup already deleted.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM sse_outbox
            WHERE id IN (
                SELECT id FROM sse_outbox
                WHERE event_time < :eventTime
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByEventTimeBeforeSkipLocked(@Param("eventTime") eventTime: LocalDateTime): Int

    /**
     * Backlog for [SseOutboxListenerService]'s reconnect replay - the events whose `pg_notify` was
     * delivered to nobody because the listening connection was down when they were written.
     */
    fun findAllByEventTimeAfterOrderByEventTimeAsc(eventTime: LocalDateTime): List<SseOutboxEntity>
}
