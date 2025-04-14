package at.wrk.tafel.admin.backend.database.common.sse_outbox

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

interface SseOutboxRepository : JpaRepository<SseOutboxEntity, Long> {

    fun deleteAllByEventTimeBefore(eventTime: LocalDateTime)

}
