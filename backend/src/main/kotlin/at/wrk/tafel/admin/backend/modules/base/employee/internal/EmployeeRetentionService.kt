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
 * GDPR gap G13 - the `employees` half of what `UserRetentionService` does for `users`. An employee who
 * has not been used for longer than the configured window is deleted through the same
 * [EmployeeService.deleteEmployee] a staff member's manual delete uses. Used means named as driver or
 * co-driver on a food collection; the employee's own row is not what counts, it hardly ever changes -
 * see [EmployeeRepository.findExpiredEmployeeIdsSkipLocked]'s KDoc for exactly what is measured, and
 * `TafelAdminEmployeeRetentionProperties`'s KDoc for the window itself. The food collections stay and
 * show "Mitarbeiter gelöscht" for the deleted driver.
 *
 * Employees are independent of user accounts, so this job runs on its own clock - once a night at
 * 06:30, after `UserRetentionService` (06:15).
 *
 * A run that throws, or that would delete more than [TafelAdminEmployeeRetentionProperties.maxDeletionsPerRun],
 * publishes `RetentionRunAlertEvent` instead of proceeding silently - GDPR gap G19. See
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
