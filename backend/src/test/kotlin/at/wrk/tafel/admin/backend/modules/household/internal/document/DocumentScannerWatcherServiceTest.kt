package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DocumentScannerWatcherServiceTest {

    @RelaxedMockK
    private lateinit var scannerFileService: ScannerFileService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var service: DocumentScannerWatcherService

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

    @Test
    fun `pollForChanges does nothing at all while the scanner folder is switched off`() {
        every { scannerFileService.isEnabled() } returns false

        service.pollForChanges()

        verify(exactly = 0) { scannerFileService.listFiles() }
        verify(exactly = 0) { sseOutboxService.saveOutboxEntry(any(), any()) }
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
