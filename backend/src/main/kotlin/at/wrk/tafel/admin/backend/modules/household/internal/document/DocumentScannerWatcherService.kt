package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.util.concurrent.TimeUnit

/**
 * Keeps the frontend's scanner-folder file picker in sync with the actual folder contents.
 *
 * A real filesystem watcher (`java.nio.file.WatchService`) is unreliable over the NFS/SMB network
 * mounts this folder is expected to be (a NAS share a physical scanner writes to), so this polls
 * the folder on a short, fixed delay instead and only publishes to the SSE outbox
 * ([SseOutboxService]) when the listing actually changed - still genuine server push to the
 * frontend, just polling-based change detection rather than OS-level file events.
 */
@Service
class DocumentScannerWatcherService(
    private val scannerFileService: ScannerFileService,
    private val sseOutboxService: SseOutboxService,
) {

    @Volatile
    private var lastKnownListing: List<ScannerFileItem> = emptyList()

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.SECONDS)
    fun pollForChanges() {
        publishIfChanged()
    }

    /**
     * Also called right after a scanner file is imported into a household ([HouseholdDocumentService]),
     * so the importer's own UI (and anyone else watching) sees the file disappear immediately
     * instead of waiting for the next poll tick.
     */
    fun publishIfChanged() {
        val current = scannerFileService.listFiles()
        if (current != lastKnownListing) {
            lastKnownListing = current
            sseOutboxService.saveOutboxEntry(NOTIFICATION_NAME, ScannerFileListResponse(current))
        }
    }

    companion object {
        const val NOTIFICATION_NAME = "document_scanner_files"
    }
}
