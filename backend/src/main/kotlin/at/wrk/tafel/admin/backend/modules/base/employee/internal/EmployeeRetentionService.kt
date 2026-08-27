package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertEvent
import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertReason
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

/**
 * GDPR gap G13 - the `employees` half of what `UserRetentionService` does for `users`. An employee no
 * longer referenced by any other table is deleted through the same
 * [EmployeeService.deleteEmployee] a staff member's manual delete uses, once its row hasn't been
 * written to in longer than the configured window - see
 * [EmployeeRepository.findExpiredEmployeeIdsSkipLocked]'s KDoc for the full list of tables checked,
 * and `TafelAdminEmployeeRetentionProperties`'s KDoc for the window itself.
 *
 * [EmployeeRepository.findExpiredEmployeeIdsSkipLocked] already excludes any employee referenced
 * anywhere, so `deleteEmployee`'s own guard against a linked user account never actually fires here -
 * it stays in place because that method is also the manual `DELETE /api/employees/{employeeId}`
 * endpoint's, and is what protects against a user account getting (re)linked between the candidate
 * select and this transaction's delete.
 *
 * Runs once a night, at 06:30 - after `UserRetentionService` (06:15), so an employee whose only user
 * account is deleted the same night is a candidate for the very next run rather than an extra day.
 *
 * A run that throws, or that would delete more than [TafelAdminEmployeeRetentionProperties.maxDeletionsPerRun],
 * publishes `RetentionRunAlertEvent` instead of proceeding silently - GDPR gap G18. See
 * `HouseholdRetentionService`'s KDoc for why the ceiling check after the candidates are already
 * claimed is safe.
 */
@Service
class EmployeeRetentionService(
    private val employeeRepository: EmployeeRepository,
    private val employeeService: EmployeeService,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
    private val eventPublisher: ApplicationEventPublisher,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(EmployeeRetentionService::class.java)
        private const val JOB_NAME = "Mitarbeiter-Bereinigung"
    }

    @Scheduled(cron = "\${tafeladmin.employeeDeletion.cleanupCron:0 30 6 * * *}")
    @Transactional
    fun cleanupExpiredEmployees() {
        if (!properties.employeeDeletion.enabled) {
            logger.debug("Employee retention is disabled - keeping every unreferenced employee regardless of age")
            return
        }

        val retentionTime = properties.employeeDeletion.retentionTime
        if (retentionTime.isZero || retentionTime.isNegative) {
            logger.debug("Employee retention is disabled (retentionTime={}) - keeping every employee", retentionTime)
            return
        }

        try {
            val cutoff = LocalDateTime.now(clock).minus(retentionTime)
            val expiredEmployeeIds = employeeRepository.findExpiredEmployeeIdsSkipLocked(cutoff)
            if (expiredEmployeeIds.isEmpty()) {
                return
            }

            val ceiling = properties.employeeDeletion.maxDeletionsPerRun
            if (ceiling > 0 && expiredEmployeeIds.size > ceiling) {
                logger.warn(
                    "Employee retention would delete {} employee(s), above the configured ceiling of {} - refusing this run",
                    expiredEmployeeIds.size,
                    ceiling,
                )
                eventPublisher.publishEvent(
                    RetentionRunAlertEvent(
                        jobName = JOB_NAME,
                        reason = RetentionRunAlertReason.CEILING_EXCEEDED,
                        detail = "${expiredEmployeeIds.size} Mitarbeiter betroffen, Limit liegt bei $ceiling.",
                    ),
                )
                return
            }

            expiredEmployeeIds.forEach { employeeService.deleteEmployee(it) }
            logger.info(
                "Deleted {} unreferenced employee(s) untouched since before {} ({} retention)",
                expiredEmployeeIds.size,
                cutoff,
                retentionTime,
            )
        } catch (e: Exception) {
            logger.error("Employee retention run failed", e)
            eventPublisher.publishEvent(
                RetentionRunAlertEvent(
                    jobName = JOB_NAME,
                    reason = RetentionRunAlertReason.FAILED,
                    detail = "${e.javaClass.simpleName}: ${e.message}",
                ),
            )
            throw e
        }
    }
}
