package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Paths
import java.time.Clock
import java.time.Instant

/**
 * Warns before `household`'s `ScannerFileCleanupService` deletes an unclaimed file from the scanner
 * share (`tafeladmin.storage.scannerPath`) - GDPR gap G18, see `docs/architecture/gdpr-compliance.md`.
 * Reads the folder directly, the same ambient-config-and-filesystem access
 * [DistributionStillOpenReminderService]/[ExcessiveReadAccessDetectionService] already use for their
 * own checks, rather than going through `household`'s `ScannerFileService` - so this module gains no
 * dependency on that one, matching its own package-info's "this module only ever listens".
 *
 * Fires daily and repeats every day a file stays in the warning window, the same "keeps nagging
 * until the condition clears" shape as [DistributionStillOpenReminderService] - a single warning
 * that arrives while nobody is looking would be worth little, and a file sitting in the window for a
 * week is exactly the case this exists for.
 */
@Component
class ScannerFileExpiryReminderService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val pushBroadcastService: PushBroadcastService,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ScannerFileExpiryReminderService::class.java)
    }

    /**
     * Sent once per cluster, not once per instance, for the same reason as
     * [DistributionStillOpenReminderService]: a notification is the one kind of scheduled work a
     * second run cannot repeat harmlessly, and there are no rows of its own to claim the way the
     * retention cleanups do.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @SchedulerLock(name = "scannerFileExpiryReminder", lockAtMostFor = "PT1H", lockAtLeastFor = "PT1H")
    fun remindAboutExpiringScannerFiles() {
        val storage = tafelAdminProperties.storage
        val scannerPath = storage.scannerPath ?: return
        val retention = storage.scannerFileRetention
        if (retention.isZero || retention.isNegative) {
            return
        }

        val scannerDir = Paths.get(scannerPath)
        if (!Files.isDirectory(scannerDir)) {
            return
        }

        val warning = storage.scannerFileRetentionWarning.coerceAtMost(retention)
        val warnCutoff = Instant.now(clock).minus(retention.minus(warning))

        val expiringCount = Files.list(scannerDir).use { stream ->
            stream
                .filter { Files.isRegularFile(it) }
                .filter { Files.getLastModifiedTime(it).toInstant().isBefore(warnCutoff) }
                .count()
        }

        if (expiringCount == 0L) {
            return
        }

        logger.info(
            "{} scanner file(s) will be deleted soon by the retention job - notifying subscribed devices",
            expiringCount,
        )

        pushBroadcastService.broadcast(
            type = PushNotificationType.SCANNER_FILES_EXPIRING,
            title = "Gescannte Dateien werden bald gelöscht",
            body = "$expiringCount gescannte Datei(en) werden in Kürze automatisch gelöscht, falls sie nicht importiert werden.",
        )
    }
}
