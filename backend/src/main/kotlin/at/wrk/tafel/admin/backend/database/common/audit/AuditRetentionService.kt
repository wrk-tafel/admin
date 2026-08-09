package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

/**
 * The only thing that ever removes an audit entry.
 *
 * The log holds names, addresses and income figures of people whose household may since have been
 * deleted - precisely the data a deletion is meant to remove - so it has an expiry rather than
 * living forever. Deleting a household does *not* purge its entries early: the DELETE entry with the
 * last known values is the one thing the schema used to lose on every merge, and dropping it on
 * request would defeat the point of recording it. Entries age out on this clock like every other.
 *
 * Runs once a night rather than hourly: unlike the outbox and scanner cleanups this competes with
 * nothing for freshness, and a year-old boundary does not move meaningfully within a day. 05:00 is
 * the quiet window between the last late-evening work and the first distribution-day activity, so a
 * delete of a year's worth of rows never lands while anyone is working. `DocumentStorageCleanupService`
 * shares that slot; the two contend for nothing (rows here, files there) beyond the single
 * scheduled-task thread they take turns on.
 */
@Service
class AuditRetentionService(
    private val auditLogRepository: AuditLogRepository,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditRetentionService::class.java)
    }

    /**
     * The schedule is a plain placeholder rather than a [TafelAdminProperties] field, for the same
     * reason as `tafeladmin.configReload.interval` (see `ConfigFileReloadService`): `@Scheduled`
     * fixes the expression when the bean is created, so a reloaded value could never take effect,
     * and listing it beside the reloadable `retentionDays` would advertise a liveness it doesn't
     * have. Changing it needs a restart.
     */
    @Scheduled(cron = "\${tafeladmin.audit.cleanupCron:0 0 5 * * *}")
    @Transactional
    fun cleanupExpiredEntries() {
        val retentionDays = properties.audit.retentionDays
        if (retentionDays <= 0) {
            logger.debug("Audit retention is disabled (retentionDays={}) - keeping every entry", retentionDays)
            return
        }

        val cutoff = LocalDateTime.now(clock).minusDays(retentionDays)
        val deletedCount = auditLogRepository.deleteAllByOccurredAtBefore(cutoff)
        if (deletedCount > 0) {
            logger.info("Removed {} audit entries older than {}", deletedCount, cutoff)
        }
    }
}
