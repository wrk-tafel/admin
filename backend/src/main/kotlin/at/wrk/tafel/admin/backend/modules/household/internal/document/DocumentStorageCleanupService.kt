package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
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
 * Deletes document files left behind on disk once their DB row is gone.
 *
 * Normal deletion paths (`HouseholdDocumentService.deleteDocument`,
 * `HouseholdService.deleteHouseholdByHouseholdId`) already remove the file itself, but anything
 * that drops `household_documents` rows without going through that code - most notably resetting
 * a dev/test database, which never touches the documents mount - leaves the file behind on disk
 * indefinitely. This periodically reconciles the documents folder against the DB and removes
 * whatever is no longer referenced.
 */
@Service
class DocumentStorageCleanupService(
    private val documentRepository: DocumentRepository,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger: Logger = LoggerFactory.getLogger(DocumentStorageCleanupService::class.java)

        // `storagePath` is stored as an absolute path (DocumentStorageService.store), so if
        // `documentsPath` is ever re-mounted at a different path - or the same share addressed via a
        // different spelling - every stored path mismatches this walk's, and every referenced file
        // would look orphaned even though none of them actually are. Real staleness only ever affects
        // a minority of a deployment's documents at a time; a walk where most referenced files can't
        // be found on disk is a sign the comparison itself is broken, not that the folder needs
        // emptying.
        private const val ORPHAN_RATIO_ABORT_THRESHOLD = 0.5

        // Below this many known documents the ratio above is too noisy to mean anything (a single
        // household with one genuinely stale reference is already a 100% "orphan ratio"), so small
        // deployments skip the guard entirely and fall back to the plain per-file comparison.
        private const val MIN_KNOWN_PATHS_FOR_GUARD = 20
    }

    /**
     * Shares 05:00 with `AuditRetentionService` - the quiet window between the last late-evening
     * work and the first distribution-day activity. The two never contend for anything: this one
     * only walks the documents folder, that one only deletes `audit_log` rows. They do share the
     * single scheduled-task thread (`spring.task.scheduling.pool.size` is left at its default of 1),
     * so they run one after the other rather than at once - which is fine, since neither is
     * time-critical and both have hours of headroom.
     *
     * Runs on one instance per night. Unlike the retention cleanups this has no rows to claim - it
     * reconciles a folder against the database, and two instances walking the same mount would race
     * over which of them deletes a file the other is still deciding about. `lockAtLeastFor` keeps a
     * second instance's 05:00 from starting its own walk seconds after the first finished a short
     * one; `lockAtMostFor` matches it because it may not be shorter, and an hour is well past the
     * longest plausible walk of the documents folder anyway.
     */
    @Scheduled(cron = "0 0 5 * * *")
    @SchedulerLock(name = "documentStorageCleanup", lockAtMostFor = "PT1H", lockAtLeastFor = "PT1H")
    fun cleanupOrphanedFiles() {
        val documentsRoot = Paths.get(tafelAdminProperties.storage.documentsPath)
        if (!Files.isDirectory(documentsRoot)) {
            return
        }

        val knownPaths = documentRepository.findAllStoragePaths().toSet()

        val allFiles: List<Path> = Files.walk(documentsRoot).use { stream ->
            stream.filter { Files.isRegularFile(it) }.toList()
        }
        val filePathStrings = allFiles.map { it.toAbsolutePath().toString() }.toSet()

        if (knownPaths.size >= MIN_KNOWN_PATHS_FOR_GUARD) {
            val missingCount = knownPaths.count { it !in filePathStrings }
            val missingRatio = missingCount.toDouble() / knownPaths.size
            if (missingRatio > ORPHAN_RATIO_ABORT_THRESHOLD) {
                logger.error(
                    "Aborting document storage cleanup: {} of {} referenced storagePaths ({}) don't " +
                        "match a file on disk - this looks like documentsPath was remounted/renamed " +
                        "rather than an actual pile-up of stale files, skipping deletion to avoid a " +
                        "mass data loss.",
                    missingCount,
                    knownPaths.size,
                    missingRatio,
                )
                return
            }
        }

        // A file is written to disk (DocumentStorageService.store) before its DB row is committed
        // (HouseholdDocumentService.uploadDocument/importFromScannerFile) - skipping anything newer
        // than this avoids deleting a just-uploaded file out from under a request still in flight.
        val cutoff = Instant.now().minus(tafelAdminProperties.storage.orphanedFileMinAge)
        val orphanedFiles = allFiles
            .filter { it.toAbsolutePath().toString() !in knownPaths }
            .filter { Files.getLastModifiedTime(it).toInstant().isBefore(cutoff) }

        orphanedFiles.forEach { deleteOrphanedFile(it) }
    }

    private fun deleteOrphanedFile(file: Path) {
        Files.deleteIfExists(file)
        logger.info("Deleted orphaned document file: {}", file)
    }
}
