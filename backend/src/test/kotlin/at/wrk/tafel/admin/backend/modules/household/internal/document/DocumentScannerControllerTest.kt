package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DocumentScannerControllerTest {

    @RelaxedMockK
    private lateinit var scannerFileService: ScannerFileService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    @InjectMockKs
    private lateinit var controller: DocumentScannerController

    @Test
    fun `get scanner files`() {
        val files = listOf(ScannerFileItem(fileName = "scan1.pdf", displayName = "Scan 1", sizeBytes = 100, modifiedAt = LocalDateTime.now()))
        every { scannerFileService.listFiles() } returns files

        val response = controller.getScannerFiles()

        assertThat(response.items).isEqualTo(files)
    }

    /**
     * Whether the feature is available at all is answered by `ConfigController`, not here - this
     * endpoint just returns whatever the service lists, which is nothing while it's switched off
     * (see `ScannerFileServiceTest`).
     */
    @Test
    fun `get scanner files returns an empty list while the feature is switched off`() {
        every { scannerFileService.listFiles() } returns emptyList()

        assertThat(controller.getScannerFiles().items).isEmpty()
    }

    @Test
    fun `get scanner file content`() {
        every { scannerFileService.read("scan1.png") } returns "bytes".toByteArray()
        every { scannerFileService.resolveContentType("scan1.png") } returns "image/png"

        val response = controller.getScannerFileContent("scan1.png")

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.contentDisposition.filename).isEqualTo("scan1.png")
        assertThat(response.headers.contentDisposition.type).isEqualTo("inline")
        assertThat(response.headers.contentType?.toString()).isEqualTo("image/png")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo(AuditScope.SCANNER_FILE_ENTITY_TYPE)
        assertThat(entrySlot.captured.entityId).isNull()
        assertThat(entrySlot.captured.businessKey).isEqualTo("scan1.png")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }
}
