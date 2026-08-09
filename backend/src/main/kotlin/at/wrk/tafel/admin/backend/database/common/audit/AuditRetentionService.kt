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
 * Runs nightly rather than hourly: unlike the outbox and scanner cleanups this competes with nothing
 * for freshness, and a year-old boundary does not move meaningfully within a day.
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

    @Scheduled(cron = "0 30 3 * * *")
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
