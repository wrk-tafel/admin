package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

/**
 * GDPR gap G13 (`docs/architecture/gdpr-compliance.md`) - mirrors `HouseholdRetentionService` (G1)
 * for staff accounts: a `users` row otherwise stays in the database, permissions and all, until an
 * administrator opens it and presses delete.
 *
 * Only a *disabled* account is ever a candidate, measured from
 * [at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity.updatedAt] rather than
 * `lastLogin` - see `TafelAdminUserRetentionProperties`'s KDoc for why. An account holding
 * [UserPermissions.ADMINISTRATOR] is never a candidate, full stop, regardless of `enabled` or age -
 * unlike `UserController`'s manual safeguards, which only ever protect the *last* one, this job never
 * touches that permission at all. Deletion goes through [TafelUserDetailsManager.deleteUser], the
 * same method the manual `DELETE /api/users/{userId}` endpoint uses, which leaves the linked
 * `employees` row alone - `EmployeeRetentionService` (also G13) has its own clock for that.
 *
 * Runs once a night, at 06:15 - after `HouseholdRetentionService` (06:00), before
 * `EmployeeRetentionService` (06:30).
 */
@Service
class UserRetentionService(
    private val userRepository: UserRepository,
    private val userDetailsManager: TafelUserDetailsManager,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(UserRetentionService::class.java)
    }

    @Scheduled(cron = "\${tafeladmin.userDeletion.cleanupCron:0 15 6 * * *}")
    @Transactional
    fun cleanupExpiredUsers() {
        if (!properties.userDeletion.enabled) {
            logger.debug("User retention is disabled - keeping every disabled account regardless of age")
            return
        }

        val retentionYears = properties.userDeletion.retentionYears
        if (retentionYears <= 0) {
            logger.debug("User retention is disabled (retentionYears={}) - keeping every account", retentionYears)
            return
        }

        val cutoff = LocalDateTime.now(clock).minusYears(retentionYears)
        val expiredUserIds = userRepository.findExpiredUserIdsSkipLocked(cutoff, UserPermissions.ADMINISTRATOR.key)
        if (expiredUserIds.isEmpty()) {
            return
        }

        userRepository.findAllById(expiredUserIds).forEach { userDetailsManager.deleteUser(it.username) }
        logger.info(
            "Deleted {} disabled user account(s) untouched since before {} ({} year(s) retention)",
            expiredUserIds.size,
            cutoff,
            retentionYears,
        )
    }
}
