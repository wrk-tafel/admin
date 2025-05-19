package at.wrk.tafel.admin.backend.database.common.sse_outbox

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface SseOutboxRepository : JpaRepository<SseOutboxEntity, Long> {

    @Transactional
    fun deleteAllByEventTimeBefore(eventTime: LocalDateTime)

}
