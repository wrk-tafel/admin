package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DocumentScannerWatcherServiceTest {

    @RelaxedMockK
    private lateinit var scannerFileService: ScannerFileService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @RelaxedMockK
    private lateinit var lockingTaskExecutor: LockingTaskExecutor

    @InjectMockKs
    private lateinit var service: DocumentScannerWatcherService

    /** Stands in for winning the lock, so the tests below see the poll they would otherwise gate. */
    @BeforeEach
    fun runWhateverIsLocked() {
        every { lockingTaskExecutor.executeWithLock(any<Runnable>(), any()) } answers {
            firstArg<Runnable>().run()
        }
    }

    @Test
    fun `publishIfChanged publishes when the listing changed`() {
        val files = listOf(ScannerFileItem(fileName = "scan1.pdf", displayName = "Scan 1", sizeBytes = 100, modifiedAt = LocalDateTime.now()))
        every { scannerFileService.listFiles() } returns files

        service.publishIfChanged()

        verify(exactly = 1) {
            sseOutboxService.saveOutboxEntry(DocumentScannerWatcherService.NOTIFICATION_NAME, ScannerFileListResponse(files))
        }
    }

    @Test
    fun `publishIfChanged does not publish again when the listing is unchanged`() {
        val files = listOf(ScannerFileItem(fileName = "scan1.pdf", displayName = "Scan 1", sizeBytes = 100, modifiedAt = LocalDateTime.now()))
        every { scannerFileService.listFiles() } returns files

        service.publishIfChanged()
        service.publishIfChanged()

        verify(exactly = 1) {
            sseOutboxService.saveOutboxEntry(DocumentScannerWatcherService.NOTIFICATION_NAME, any())
        }
    }

    @Test
    fun `publishIfChanged publishes again once the listing changes`() {
        val files1 = listOf(ScannerFileItem(fileName = "scan1.pdf", displayName = "Scan 1", sizeBytes = 100, modifiedAt = LocalDateTime.now()))
        val files2 = files1 + ScannerFileItem(fileName = "scan2.pdf", displayName = "Scan 2", sizeBytes = 200, modifiedAt = LocalDateTime.now())
        every { scannerFileService.listFiles() } returns files1 andThen files2

        service.publishIfChanged()
        service.publishIfChanged()

        verify(exactly = 1) { sseOutboxService.saveOutboxEntry(DocumentScannerWatcherService.NOTIFICATION_NAME, ScannerFileListResponse(files1)) }
        verify(exactly = 1) { sseOutboxService.saveOutboxEntry(DocumentScannerWatcherService.NOTIFICATION_NAME, ScannerFileListResponse(files2)) }
    }

    /**
     * The lock must stay behind the feature check: a deployment without a scanner folder would
     * otherwise pay a database round trip every second to take a lock for a job that returns
     * immediately - which is the whole reason this one locks by hand instead of by annotation.
     */
    @Test
    fun `pollForChanges does nothing at all while the scanner folder is switched off`() {
        every { scannerFileService.isEnabled() } returns false

        service.pollForChanges()

        verify(exactly = 0) { scannerFileService.listFiles() }
        verify(exactly = 0) { sseOutboxService.saveOutboxEntry(any(), any()) }
        verify(exactly = 0) { lockingTaskExecutor.executeWithLock(any<Runnable>(), any()) }
    }

    @Test
    fun `pollForChanges polls under the lock, and does not hold it between ticks`() {
        every { scannerFileService.isEnabled() } returns true
        every { scannerFileService.listFiles() } returns emptyList()

        service.pollForChanges()

        val lock = slot<LockConfiguration>()
        verify(exactly = 1) { lockingTaskExecutor.executeWithLock(any<Runnable>(), capture(lock)) }
        assertThat(lock.captured.name).isEqualTo("documentScannerWatcherPoll")
        // Nothing is kept past the poll itself, so the next second's tick is contested again and the
        // watch moves to another instance on its own once this one stops taking part.
        assertThat(lock.captured.lockAtLeastFor).isZero()
    }

    /**
     * An import has just changed the folder and its own UI is waiting to see it - that publish is
     * not the poll and must not be gated by whoever happens to hold it.
     */
    @Test
    fun `publishIfChanged is not gated by the poll lock`() {
        every { scannerFileService.listFiles() } returns emptyList()

        service.publishIfChanged()

        verify(exactly = 0) { lockingTaskExecutor.executeWithLock(any<Runnable>(), any()) }
    }

    @Test
    fun `pollForChanges polls while the scanner folder is switched on`() {
        every { scannerFileService.isEnabled() } returns true
        every { scannerFileService.listFiles() } returns emptyList()

        service.pollForChanges()

        verify(exactly = 1) { scannerFileService.listFiles() }
    }

    @Test
    fun `publishIfChanged does not publish when there was and still is nothing`() {
        every { scannerFileService.listFiles() } returns emptyList()

        service.publishIfChanged()

        verify(exactly = 0) { sseOutboxService.saveOutboxEntry(any(), any()) }
    }
}
