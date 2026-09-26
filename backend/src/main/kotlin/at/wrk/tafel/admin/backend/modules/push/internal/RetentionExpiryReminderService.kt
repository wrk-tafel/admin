package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.retention.RetentionWindow
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime

/**
 * Warns administrators before the retention jobs delete personal data - GDPR gaps G1 and G13, see
 * `docs/architecture/gdpr-compliance.md`. `HouseholdRetentionService`, `UserRetentionService` and
 * `EmployeeRetentionService` delete silently and only report a run that failed or would exceed its
 * ceiling, so a slow trickle of deletions would otherwise go unnoticed until someone misses a
 * record.
 *
 * For each job, counts everything that will reach its retention window within the next
 * `retentionWarning` of that job (30 days by default) - what is already due included, since a record
 * the job has not removed yet (its ceiling stopped the run, or it is about to run) is exactly what an
 * administrator should hear about. The measure is the job's own: a household's `validUntil`, a user's
 * last login (an account that never logged in from its creation date, an administrator never), an
 * employee's last use as driver or co-driver. A job that is switched off, or whose retention time is
 * zero or negative, is left out. One combined notification a day, not one per job.
 *
 * Fires daily and repeats every day something stays in the warning window, the same "keeps nagging
 * until the condition clears" shape as [ScannerFileExpiryReminderService]: a customer being
 * prolonged, a user logging in or someone deleting the record clears it. Reads the repositories
 * directly, like [ExcessiveReadAccessDetectionService] does, rather than depending on the modules
 * that own the jobs.
 */
@Component
class RetentionExpiryReminderService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val userRepository: UserRepository,
    private val householdRepository: HouseholdRepository,
    private val employeeRepository: EmployeeRepository,
    private val pushBroadcastService: PushBroadcastService,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(RetentionExpiryReminderService::class.java)
    }

    /**
     * Sent once per cluster, not once per instance, for the same reason as
     * [ScannerFileExpiryReminderService]: a notification is the one kind of scheduled work a second
     * run cannot repeat harmlessly.
     */
    @Scheduled(cron = "0 5 8 * * *")
    @SchedulerLock(name = "retentionExpiryReminder", lockAtMostFor = "PT1H", lockAtLeastFor = "PT1H")
    fun remindAboutExpiringData() {
        val now = LocalDateTime.now(clock)
        val config = tafelAdminProperties

        val users = RetentionWindow.warnCutoff(config.userDeletion.enabled, config.userDeletion.retentionTime, config.userDeletion.retentionWarning, now)
            ?.let { userRepository.countUsersLastActiveBefore(it, UserPermissions.ADMINISTRATOR.key) } ?: 0L
        val households = RetentionWindow.warnCutoff(
            config.householdDeletion.enabled,
            config.householdDeletion.retentionTime,
            config.householdDeletion.retentionWarning,
            now,
        )?.let { householdRepository.countByValidUntilBefore(it.toLocalDate()) } ?: 0L
        val employees = RetentionWindow.warnCutoff(
            config.employeeDeletion.enabled,
            config.employeeDeletion.retentionTime,
            config.employeeDeletion.retentionWarning,
            now,
        )?.let { employeeRepository.countEmployeesLastUsedBefore(it) } ?: 0L

        val parts = listOfNotNull(
            "Benutzerkonten: $users".takeIf { users > 0 },
            "Kunden: $households".takeIf { households > 0 },
            "Mitarbeiter: $employees".takeIf { employees > 0 },
        )
        if (parts.isEmpty()) {
            return
        }

        logger.info(
            "Retention jobs will soon delete {} user account(s), {} household(s), {} employee(s) - notifying administrators",
            users,
            households,
            employees,
        )

        pushBroadcastService.broadcast(
            type = PushNotificationType.RETENTION_EXPIRING,
            title = "Daten werden bald gelöscht",
            body = "${parts.joinToString(", ")} - diese Datensätze werden in Kürze wegen abgelaufener Aufbewahrungsfrist automatisch gelöscht.",
        )
    }
}
