package at.wrk.tafel.admin.backend.modules.household.internal.document

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
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
}
