package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface SseOutboxRepository : JpaRepository<SseOutboxEntity, Long> {

    @Transactional
    fun deleteAllByEventTimeBefore(eventTime: LocalDateTime)

    /**
     * Backlog for [SseOutboxListenerService]'s reconnect replay - the events whose `pg_notify` was
     * delivered to nobody because the listening connection was down when they were written.
     */
    fun findAllByEventTimeAfterOrderByEventTimeAsc(eventTime: LocalDateTime): List<SseOutboxEntity>
}
