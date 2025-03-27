package at.wrk.tafel.admin.backend.database.model.audit.model

import org.springframework.data.jpa.repository.JpaRepository

interface AuditLogRepository : JpaRepository<AuditLogEntity, Long>
