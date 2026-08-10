package at.wrk.tafel.admin.backend.database.common.audit

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component

/**
 * Who is behind the write currently being made, as a username.
 *
 * Read per call rather than cached anywhere: it is thread-local state that only means anything on
 * the request thread that set it. A write with no authenticated user behind it - a scheduled job,
 * the Flyway testdata import, the initial-admin bootstrap - answers `null`, which is recorded as
 * such rather than guessed at.
 *
 * The same value feeds two different things: Spring Data JPA auditing's `@CreatedBy`/`@LastModifiedBy`
 * on `BaseChangeTrackingEntity` (see `JpaAuditingConfig`) and `audit_log.actor_username`
 * ([AuditLogWriter]), so the two can never disagree about who did something.
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
}
