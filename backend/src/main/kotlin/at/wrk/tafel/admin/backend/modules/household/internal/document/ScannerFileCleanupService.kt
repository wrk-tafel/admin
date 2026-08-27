package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant

/**
 * Deletes files left on the scanner share (`tafeladmin.storage.scannerPath`) once nobody has
 * imported or discarded them within `tafeladmin.storage.scannerFileRetention` - GDPR gap G18
 * (Art. 5(1)(e), see `docs/architecture/gdpr-compliance.md`). Unlike an already-imported document,
 * a scanner file has no database row at all - `ScannerFileService` only ever lists/reads/deletes
 * the folder directly - so there is nothing to reconcile against
 * ([DocumentStorageCleanupService]'s job): this only ever needs a file's own age.
 *
 * `ScannerFileExpiryReminderService` (in the `push` module) warns about a file before this deletes
 * it - the two are deliberately separate jobs reading the same share independently rather than one
 * publishing an event for the other to react to, the same ambient-config-and-filesystem access
 * `DistributionStillOpenReminderService`/`ExcessiveReadAccessDetectionService` already use for their
 * own checks, so neither module gains a dependency on the other.
 */
@Service
class ScannerFileCleanupService(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger: Logger = LoggerFactory.getLogger(ScannerFileCleanupService::class.java)
    }

    /**
     * Shares the 05:00 quiet window with `DocumentStorageCleanupService`/`AuditRetentionService` -
     * see that service's KDoc for why the shared scheduling thread is fine here too. There is no
     * state a second instance could race over - a file is either older than the cutoff or it isn't -
     * but a `SchedulerLock` still keeps two instances from walking the same share twice a night for
     * nothing (ADR-0047).
     */
    @Scheduled(cron = "0 5 5 * * *")
    @SchedulerLock(name = "scannerFileCleanup", lockAtMostFor = "PT1H", lockAtLeastFor = "PT1H")
    fun cleanupExpiredScannerFiles() {
        val scannerPath = tafelAdminProperties.storage.scannerPath ?: return
        val retention = tafelAdminProperties.storage.scannerFileRetention
        if (retention.isZero || retention.isNegative) {
            return
        }

        val scannerDir = Paths.get(scannerPath)
        if (!Files.isDirectory(scannerDir)) {
            return
        }

        val cutoff = Instant.now().minus(retention)

        val expiredFiles: List<Path> = Files.list(scannerDir).use { stream ->
            stream
                .filter { Files.isRegularFile(it) }
                .filter { Files.getLastModifiedTime(it).toInstant().isBefore(cutoff) }
                .toList()
        }

        expiredFiles.forEach { deleteExpiredFile(it) }
    }

    private fun deleteExpiredFile(file: Path) {
        Files.deleteIfExists(file)
        logger.info("Deleted expired scanner file: {}", file)
    }
}
