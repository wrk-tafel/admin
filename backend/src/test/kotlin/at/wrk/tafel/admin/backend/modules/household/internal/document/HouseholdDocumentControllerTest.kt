package at.wrk.tafel.admin.backend.modules.household.internal.document

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockMultipartFile
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class HouseholdDocumentControllerTest {

    @RelaxedMockK
    private lateinit var service: HouseholdDocumentService

    @InjectMockKs
    private lateinit var controller: HouseholdDocumentController

    @Test
    fun `upload document - successful`() {
        val householdId = 123L
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", "content".toByteArray())
        val documentItem = DocumentItem(
            id = 1,
            documentType = DocumentType.PROOF_OF_INCOME,
            fileName = "proof.pdf",
            uploadedAt = LocalDateTime.now(),
        )
        every { service.uploadDocument(householdId, null, DocumentType.PROOF_OF_INCOME, file) } returns documentItem

        val response = controller.uploadDocument(householdId, file, DocumentType.PROOF_OF_INCOME, null)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(documentItem)
    }

    @Test
    fun `import scanner document - successful`() {
        val householdId = 123L
        val documentItem = DocumentItem(
            id = 2,
            documentType = DocumentType.OTHER,
            fileName = "scan.pdf",
            uploadedAt = LocalDateTime.now(),
        )
        every { service.importFromScannerFile(householdId, "scan.pdf", 5L, DocumentType.OTHER) } returns documentItem

        val response = controller.importScannerDocument(
            householdId,
            ImportScannerDocumentRequest(fileName = "scan.pdf", documentType = DocumentType.OTHER, personId = 5L),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(documentItem)
    }

    @Test
    fun `get documents`() {
        val householdId = 123L
        val documentItem = DocumentItem(
            id = 1,
            documentType = DocumentType.ID,
            fileName = "ausweis.jpg",
            uploadedAt = LocalDateTime.now(),
        )
        every { service.getDocuments(householdId) } returns listOf(documentItem)

        val response = controller.getDocuments(householdId)

        assertThat(response.items).containsExactly(documentItem)
    }

    @Test
    fun `download document`() {
        val householdId = 123L
        val documentId = 5L
        val result = DocumentFileResult(fileName = "ausweis.jpg", contentType = "image/jpeg", bytes = "bytes".toByteArray())
        every { service.getDocumentFile(householdId, documentId) } returns result

        val response = controller.downloadDocument(householdId, documentId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.contentDisposition.filename).isEqualTo("ausweis.jpg")
        assertThat(response.headers.contentType?.toString()).isEqualTo("image/jpeg")
    }

    @Test
    fun `delete document`() {
        val householdId = 123L
        val documentId = 5L

        val response = controller.deleteDocument(householdId, documentId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { service.deleteDocument(householdId, documentId) }
    }
}
