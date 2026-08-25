package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime

/**
 * Notices a session reading an unusual amount of sensitive data - the smallest useful step GDPR gap
 * G11 asks for, once gap G6 gave the audit trail something to notice in the first place
 * (`AuditOperation.READ`, see `docs/architecture/gdpr-compliance.md`). Deliberately just a fixed
 * threshold and not anomaly detection: an application this size has no learned "normal" to compare
 * against, and a detector nobody understands is a detector nobody trusts.
 *
 * Runs once an hour rather than continuously, so the window it checks - the trailing hour - lines up
 * with the schedule: a user who keeps exceeding the threshold is renotified every run, the same
 * "repeats until the underlying condition stops" shape as [DistributionStillOpenReminderService]'s
 * daily reminder, without needing any state of its own to track who was already told.
 *
 * Sent once per cluster, not once per instance, for the same reason as
 * [DistributionStillOpenReminderService]: a notification is the one kind of scheduled work a second
 * run cannot repeat harmlessly, and there are no rows of its own to claim the way the retention
 * cleanups do.
 */
@Component
class ExcessiveReadAccessDetectionService(
    private val auditLogRepository: AuditLogRepository,
    private val pushBroadcastService: PushBroadcastService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ExcessiveReadAccessDetectionService::class.java)
    }

    @Scheduled(cron = "\${tafeladmin.audit.breachDetectionCron:0 0 * * * *}")
    @SchedulerLock(name = "excessiveReadAccessDetection", lockAtMostFor = "PT5M", lockAtLeastFor = "PT5M")
    fun detectExcessiveReadAccess() {
        val threshold = tafelAdminProperties.audit.breachDetection.readThreshold
        if (threshold <= 0) {
            logger.debug("Read-access breach detection is disabled (readThreshold={})", threshold)
            return
        }

        val since = LocalDateTime.now(clock).minusHours(1)
        val offenders = auditLogRepository.findActorsWithOperationCountAbove(AuditOperation.READ, since, threshold.toLong())
        offenders.forEach { offender ->
            logger.warn(
                "User '{}' read {} sensitive records in the last hour (threshold {}) - notifying administrators",
                offender.username,
                offender.readCount,
                threshold,
            )

            pushBroadcastService.broadcast(
                type = PushNotificationType.EXCESSIVE_READ_ACCESS,
                title = "Ungewöhnlich viele Zugriffe",
                body = "Der Benutzer '${offender.username}' hat in der letzten Stunde ${offender.readCount} sensible Datensätze abgerufen.",
            )
        }
    }
}
