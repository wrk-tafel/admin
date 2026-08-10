package at.wrk.tafel.admin.backend.database.model.audit

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDateTime

/**
 * One recorded change. Append-only: rows are written by
 * `database.common.audit.AuditLogWriter` and removed only by `AuditRetentionService` once they age
 * out - nothing ever updates one.
 *
 * Deliberately extends [BaseEntity] and not `BaseChangeTrackingEntity`: an audit row has no "who
 * last modified it", and giving it one would only invite the idea that it could be modified.
 */
@Entity(name = "AuditLog")
@Table(name = "audit_log")
@ExcludeFromTestCoverage
class AuditLogEntity(
    @Column(name = "occurred_at", nullable = false)
    var occurredAt: LocalDateTime,
    @Column(name = "entity_type", nullable = false)
    var entityType: String,
    @Column(name = "operation", nullable = false)
    @Enumerated(EnumType.STRING)
    var operation: AuditOperation,
) : BaseEntity() {

    /**
     * Denormalized on purpose - no foreign key to `users`, so a deleted or renamed account leaves
     * the trail readable. [actorUserId] is therefore a plain number that may point at nothing, and
     * all four are null for writes no user is behind (scheduled jobs, testdata, the initial-admin
     * bootstrap).
     *
     * [actorFirstname]/[actorLastname] come from the acting user's employee record and are stamped
     * once, for the same reason: the name that made a change is part of what the entry says, not
     * something to re-read from an account that may since have been relinked or removed. They are
     * additionally null on every entry written before the columns existed.
     */
    @Column(name = "actor_user_id")
    var actorUserId: Long? = null

    @Column(name = "actor_username")
    var actorUsername: String? = null

    @Column(name = "actor_firstname")
    var actorFirstname: String? = null

    @Column(name = "actor_lastname")
    var actorLastname: String? = null

    @Column(name = "entity_id")
    var entityId: Long? = null

    /**
     * The household number for household-scoped entities, the username for user-scoped ones - what
     * still identifies the subject of the change once [entityId] points at a row that no longer
     * exists. See `AuditScope`.
     */
    @Column(name = "business_key")
    var businessKey: String? = null

    /**
     * `{"addressCity": ["Wien", "Graz"], ...}` - the fields that actually changed, old value first.
     * Held as the raw JSON document: Hibernate passes a `String` through its JSON format mapper
     * untouched and PostgreSQL's dialect casts it to `jsonb` on write, so this is a real `jsonb`
     * column that plain SQL (`changed_fields ->> 'addressCity'`) can be run against during support,
     * without a Jackson-bound Kotlin type in between.
     */
    @Column(name = "changed_fields")
    @JdbcTypeCode(SqlTypes.JSON)
    var changedFields: String? = null

    interface Specs {
        companion object {
            fun entityTypeEquals(entityType: String): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.equal(root.get<String>("entityType"), entityType)
            }

            fun operationEquals(operation: AuditOperation): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.equal(root.get<AuditOperation>("operation"), operation)
            }

            fun actorUsernameEquals(actorUsername: String): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.equal(root.get<String>("actorUsername"), actorUsername)
            }

            fun businessKeyEquals(businessKey: String): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.equal(root.get<String>("businessKey"), businessKey)
            }

            fun occurredAtFrom(from: LocalDateTime): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.greaterThanOrEqualTo(root.get("occurredAt"), from)
            }

            /**
             * Exclusive, and fed the day *after* the one the caller picked - a date filter of
             * "until the 5th" has to include everything that happened on the 5th, not stop at
             * midnight when it began.
             */
            fun occurredAtUntil(untilExclusive: LocalDateTime): Specification<AuditLogEntity> = Specification { root, _, cb ->
                cb.lessThan(root.get("occurredAt"), untilExclusive)
            }
        }
    }
}
