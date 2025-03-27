package at.wrk.tafel.admin.backend.database.model.audit.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.LocalDateTime


@Entity(name = "AuditLog")
@Table(name = "audit_logs")
@ExcludeFromTestCoverage
class AuditLogEntity : BaseEntity() {

    @Column(name = "action")
    @Enumerated(EnumType.STRING)
    var action: AuditLogAction? = null

    @Column(name = "changed_by")
    var changedBy: String? = null

    @Column(name = "changed_timestamp")
    var changedTimestamp: LocalDateTime? = null

    @Column(name = "table_name")
    var tableName: String? = null

    @Column(name = "primary_key")
    var primaryKey: Long? = null

    @Column(name = "data_before")
    var dataBefore: String? = null

    @Column(name = "data_after")
    var dataAfter: String? = null
}

enum class AuditLogAction {
    CREATE,
    UPDATE,
    DELETE
}
