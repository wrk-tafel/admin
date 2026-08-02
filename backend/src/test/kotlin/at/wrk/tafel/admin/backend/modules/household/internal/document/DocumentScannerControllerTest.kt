package at.wrk.tafel.admin.backend.modules.household.internal.document

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DocumentScannerControllerTest {

    @RelaxedMockK
    private lateinit var scannerFileService: ScannerFileService

    @InjectMockKs
    private lateinit var controller: DocumentScannerController

    @Test
    fun `get scanner files`() {
        val files = listOf(ScannerFileItem(fileName = "scan1.pdf", sizeBytes = 100, modifiedAt = LocalDateTime.now()))
        every { scannerFileService.listFiles() } returns files

        val response = controller.getScannerFiles()

        assertThat(response.items).isEqualTo(files)
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
    }
}
