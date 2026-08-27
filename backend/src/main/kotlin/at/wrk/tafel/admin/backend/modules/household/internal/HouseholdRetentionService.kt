package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertEvent
import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertReason
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * The only thing that ever removes a household because it has simply gone stale - GDPR gap G1
 * (`docs/architecture/gdpr-compliance.md`). A household otherwise stays in the database in full,
 * including its persons, notes, documents and attendance history, until a staff member opens it and
 * presses delete.
 *
 * The candidate ids are selected and locked (`FOR UPDATE SKIP LOCKED`, see
 * [HouseholdRepository.findExpiredHouseholdIdsSkipLocked]) inside the same transaction that then
 * deletes each of them, so a second instance's run skips a household this one already claimed rather
 * than racing to delete it twice (ADR-0047). Each deletion goes through
 * [HouseholdService.deleteHouseholdByHouseholdId] - the same method a staff member's manual delete
 * uses - which cascades to persons and documents (removing the files on disk too), while
 * `household_notes` and `distributions_households` cascade at the database level. That is why this
 * service needs only one retention window rather than one per data class: master data, documents and
 * attendance history all age out together.
 *
 * Runs once a night, at 06:00 - after the audit (05:00) and document-storage (05:00) cleanups, so a
 * night's deletions don't overlap with either.
 *
 * A run that throws, or that would delete more than [TafelAdminHouseholdRetentionProperties.maxDeletionsPerRun],
 * publishes [RetentionRunAlertEvent] instead of proceeding silently - GDPR gap G18. The ceiling check
 * happens after the candidates are already claimed (`FOR UPDATE SKIP LOCKED`); refusing to delete
 * them just lets the transaction end without writing, which releases the locks the same as a normal
 * commit would.
 */
@Service
class HouseholdRetentionService(
    private val householdRepository: HouseholdRepository,
    private val householdService: HouseholdService,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
    private val eventPublisher: ApplicationEventPublisher,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(HouseholdRetentionService::class.java)
        private const val JOB_NAME = "Haushalts-Bereinigung"
    }

    /**
     * The schedule is a plain placeholder rather than a [TafelAdminProperties] field, for the same
     * reason as `tafeladmin.audit.cleanupCron`: `@Scheduled` fixes the expression when the bean is
     * created, so a reloaded value could never take effect. Changing it needs a restart.
     */
    @Scheduled(cron = "\${tafeladmin.householdDeletion.cleanupCron:0 0 6 * * *}")
    @Transactional
    fun cleanupExpiredHouseholds() {
        if (!properties.householdDeletion.enabled) {
            logger.debug("Household retention is disabled - keeping every household regardless of validUntil")
            return
        }

        val retentionYears = properties.householdDeletion.retentionYears
        if (retentionYears <= 0) {
            logger.debug("Household retention is disabled (retentionYears={}) - keeping every household", retentionYears)
            return
        }

        try {
            val cutoff = LocalDate.now(clock).minusYears(retentionYears)
            val expiredHouseholdIds = householdRepository.findExpiredHouseholdIdsSkipLocked(cutoff)
            if (expiredHouseholdIds.isEmpty()) {
                return
            }

            val ceiling = properties.householdDeletion.maxDeletionsPerRun
            if (ceiling > 0 && expiredHouseholdIds.size > ceiling) {
                logger.warn(
                    "Household retention would delete {} household(s), above the configured ceiling of {} - refusing this run",
                    expiredHouseholdIds.size,
                    ceiling,
                )
                eventPublisher.publishEvent(
                    RetentionRunAlertEvent(
                        jobName = JOB_NAME,
                        reason = RetentionRunAlertReason.CEILING_EXCEEDED,
                        detail = "${expiredHouseholdIds.size} Haushalte betroffen, Limit liegt bei $ceiling.",
                    ),
                )
                return
            }

            expiredHouseholdIds.forEach { householdService.deleteHouseholdByHouseholdId(it) }
            logger.info(
                "Deleted {} household(s) whose validUntil was before {} ({} year(s) retention)",
                expiredHouseholdIds.size,
                cutoff,
                retentionYears,
            )
        } catch (e: Exception) {
            logger.error("Household retention run failed", e)
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
