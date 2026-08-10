package at.wrk.tafel.admin.backend.database.common.mailoutbox

import org.springframework.data.domain.Limit
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface MailOutboxRepository : JpaRepository<MailOutboxEntity, Long> {

    fun findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(
        status: MailOutboxStatus,
        nextAttemptAt: LocalDateTime,
        limit: Limit,
    ): List<MailOutboxEntity>

    @Transactional
    fun deleteAllByStatusAndSentAtBefore(status: MailOutboxStatus, sentAt: LocalDateTime)
}
