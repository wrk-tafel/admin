package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
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
    private val lockingTaskExecutor: LockingTaskExecutor,
) {

    @Volatile
    private var lastKnownListing: List<ScannerFileItem> = emptyList()

    /**
     * Skipped entirely while the feature is switched off (see `ScannerFileService.isEnabled`), so a
     * deployment without a scanner folder doesn't run a once-per-second no-op forever.
     *
     * One instance at a time walks the share, which is what the lock is for: the listing crosses a
     * network mount, and doing it once per second per instance is the cost worth avoiding. The lock
     * is taken here rather than with `@SchedulerLock` precisely so the feature check comes first -
     * the annotation's advice runs before the method body, so a deployment with no scanner folder
     * would otherwise pay a database round trip every second to lock a job that immediately returns.
     *
     * Taken and released once per tick, which is a constant trickle of writes to one `shedlock` row
     * while the feature is on - deliberately traded for not listing a NAS share N times a second.
     * A follower's attempt matches no row and writes nothing.
     *
     * The lock only ever covers this poll, never [publishIfChanged]'s other caller: an import has
     * just changed the folder and its own UI is waiting to see it, so it publishes whether or not
     * another instance happens to hold the poll.
     */
    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.SECONDS)
    fun pollForChanges() {
        if (!scannerFileService.isEnabled()) {
            return
        }
        lockingTaskExecutor.executeWithLock(Runnable { publishIfChanged() }, pollLockConfiguration())
    }

    /**
     * `lockAtMostFor` is the backstop for an instance that dies mid-poll, or whose listing hangs on
     * an unresponsive mount: a minute later the folder is somebody else's to watch. Nothing is held
     * between ticks - a poll that finishes releases immediately, so the next second's is contested
     * again and the watch moves on its own once an instance stops taking part.
     */
    private fun pollLockConfiguration() = LockConfiguration(
        Instant.now(),
        POLL_LOCK_NAME,
        Duration.ofMinutes(1),
        Duration.ZERO,
    )

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
        private const val POLL_LOCK_NAME = "documentScannerWatcherPoll"
    }
}
