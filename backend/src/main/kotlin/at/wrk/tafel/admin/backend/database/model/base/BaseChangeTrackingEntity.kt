package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.annotation.CreatedBy
import org.springframework.data.annotation.LastModifiedBy
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

/**
 * Per-row bookkeeping: when a row was written and by whom.
 *
 * [createdBy]/[updatedBy] hold the acting user's id, a nullable foreign key to `users(id)` with
 * `on delete set null` (`R__00111_change_tracking_actor_user_fk.sql`, ADR-0052) - deleting an
 * account clears every row it touched by itself, and they answer only "who last touched this row"
 * - the full history of what changed lives in `audit_log` (`database.common.audit.AuditLogWriter`).
 *
 * None of these four columns is an audit trail on its own, and [createdAt] in particular is read as
 * ordinary domain data in several places (the "Ausgestellt am" date on the customer PDFs, the
 * timestamp next to a household note, the "Neu"/"Verlängert" overview lists) - so don't repurpose or
 * drop them on the grounds that the audit log now exists.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
@ExcludeFromTestCoverage
abstract class BaseChangeTrackingEntity : BaseEntity() {

    @Column(name = "created_at")
    @CreationTimestamp
    open var createdAt: LocalDateTime? = null

    @Column(name = "updated_at")
    @UpdateTimestamp
    open var updatedAt: LocalDateTime? = null

    @Column(name = "created_by")
    @CreatedBy
    open var createdBy: Long? = null

    @Column(name = "updated_by")
    @LastModifiedBy
    open var updatedBy: Long? = null

    override fun toString(): String = "BaseChangeTrackingEntity(id=$id, createdAt=$createdAt, updatedAt=$updatedAt)"
}
