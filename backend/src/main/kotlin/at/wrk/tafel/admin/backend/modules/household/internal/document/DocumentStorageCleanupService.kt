package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.time.temporal.ChronoUnit

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

        // A file is written to disk (DocumentStorageService.store) before its DB row is committed
        // (HouseholdDocumentService.uploadDocument/importFromScannerFile) - skipping anything newer
        // than this avoids deleting a just-uploaded file out from under a request still in flight.
        private const val MIN_AGE_MINUTES = 60L
    }

    /**
     * Shares 05:00 with `AuditRetentionService` - the quiet window between the last late-evening
     * work and the first distribution-day activity. The two never contend for anything: this one
     * only walks the documents folder, that one only deletes `audit_log` rows. They do share the
     * single scheduled-task thread (`spring.task.scheduling.pool.size` is left at its default of 1),
     * so they run one after the other rather than at once - which is fine, since neither is
     * time-critical and both have hours of headroom.
     */
    @Scheduled(cron = "0 0 5 * * *")
    fun cleanupOrphanedFiles() {
        val documentsRoot = Paths.get(tafelAdminProperties.storage.documentsPath)
        if (!Files.isDirectory(documentsRoot)) {
            return
        }

        val knownPaths = documentRepository.findAllStoragePaths().toSet()
        val cutoff = Instant.now().minus(MIN_AGE_MINUTES, ChronoUnit.MINUTES)

        val orphanedFiles: List<Path> = Files.walk(documentsRoot).use { stream ->
            stream
                .filter { Files.isRegularFile(it) }
                .filter { it.toAbsolutePath().toString() !in knownPaths }
                .filter { Files.getLastModifiedTime(it).toInstant().isBefore(cutoff) }
                .toList()
        }

        orphanedFiles.forEach { deleteOrphanedFile(it) }
    }

    private fun deleteOrphanedFile(file: Path) {
        Files.deleteIfExists(file)
        logger.info("Deleted orphaned document file: {}", file)
    }
}
