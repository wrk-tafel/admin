package at.wrk.tafel.admin.backend.database.model.audit

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
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

    fun deleteAllByOccurredAtBefore(cutoff: LocalDateTime): Long
}
