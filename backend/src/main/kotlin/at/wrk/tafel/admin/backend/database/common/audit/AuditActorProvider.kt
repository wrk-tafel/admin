package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

/**
 * Who is behind the write currently being made.
 *
 * Read per call rather than cached anywhere: it is thread-local state that only means anything on
 * the request thread that set it. A write with no authenticated user behind it - a scheduled job,
 * the Flyway testdata import, the initial-admin bootstrap - answers `null`, which is recorded as
 * such rather than guessed at.
 *
 * [currentUsername] feeds `audit_log.actor_username` ([AuditLogWriter]), which keeps the username
 * even after the account behind it is gone - that log is append-only history, not a live reference.
 * [currentUserId] feeds Spring Data JPA auditing's `@CreatedBy`/`@LastModifiedBy` on
 * `BaseChangeTrackingEntity` (see `JpaAuditingConfig`): `created_by`/`updated_by` are a foreign key
 * to `users(id)` with `on delete set null` (ADR-0052), so unlike the audit log they are *not* meant
 * to survive the account being deleted.
 *
 * [currentUserId] deliberately reads the id off the `Authentication` itself rather than looking it
 * up by username - `AuditingEntityListener` calls it from inside Hibernate's persist cascade for the
 * entity being audited, and a query issued there can trigger an auto-flush of an only half-built
 * object graph (e.g. a household whose persons aren't attached yet), which fails loudly. Every
 * authenticated request already carries [TafelJwtAuthentication.userId], loaded once per request by
 * [at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider] for its own permission
 * check - reusing it here costs nothing extra.
 */
@Component
class AuditActorProvider {

    companion object {
        private const val ANONYMOUS_USER = "anonymousUser"
    }

    fun currentUsername(): String? {
        val authentication = SecurityContextHolder.getContext().authentication ?: return null
        if (!authentication.isAuthenticated) {
            return null
        }
        return authentication.name?.takeIf { it.isNotBlank() && it != ANONYMOUS_USER }
    }

    fun currentUserId(): Long? {
        val authentication = SecurityContextHolder.getContext().authentication ?: return null
        if (!authentication.isAuthenticated) {
            return null
        }
        return when (authentication) {
            is TafelJwtAuthentication -> authentication.userId
            else -> (authentication.principal as? TafelUser)?.id
        }
    }
}
