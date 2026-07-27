package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface SseOutboxRepository : JpaRepository<SseOutboxEntity, Long> {

    @Transactional
    fun deleteAllByEventTimeBefore(eventTime: LocalDateTime)
}
