package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.util.unit.DataSize
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class HouseholdDocumentServiceTest {

    @RelaxedMockK
    private lateinit var documentRepository: DocumentRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var documentStorageService: DocumentStorageService

    @RelaxedMockK
    private lateinit var scannerFileService: ScannerFileService

    @RelaxedMockK
    private lateinit var documentScannerWatcherService: DocumentScannerWatcherService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private lateinit var service: HouseholdDocumentService

    private val tafelAdminProperties = TafelAdminProperties()

    private lateinit var testHousehold: HouseholdEntity
    private lateinit var testAdditionalPerson: PersonEntity

    @BeforeEach
    fun beforeEach() {
        service = HouseholdDocumentService(
            documentRepository,
            householdRepository,
            userRepository,
            documentStorageService,
            scannerFileService,
            documentScannerWatcherService,
            tafelAdminProperties,
            auditLogWriter,
        )

        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        testHousehold = HouseholdEntity(householdId = 100, validUntil = LocalDate.now()).apply {
            id = 1
        }
        testAdditionalPerson = PersonEntity(household = testHousehold, country = testCountry1).apply {
            id = 5
        }
        testHousehold.persons = mutableListOf(testAdditionalPerson)

        every { householdRepository.findByHouseholdId(100L) } returns testHousehold
        every { documentStorageService.store(any(), any(), any()) } returns "/documents/100/stored.pdf"
        every { documentRepository.saveAndFlush(any()) } answers {
            firstArg<DocumentEntity>().apply {
                id = 42
                createdAt = LocalDateTime.now()
            }
        }
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `upload document - successful`() {
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", "test-content".toByteArray())

        val result = service.uploadDocument(100L, null, DocumentType.PROOF_OF_INCOME, file)

        assertThat(result.id).isEqualTo(42L)
        assertThat(result.documentType).isEqualTo(DocumentType.PROOF_OF_INCOME)
        assertThat(result.fileName).isEqualTo("proof.pdf")
        assertThat(result.personId).isNull()
        assertThat(result.uploadedBy).isEqualTo("test-personnelnumber test-firstname test-lastname")

        val entitySlot = slot<DocumentEntity>()
        verify { documentRepository.saveAndFlush(capture(entitySlot)) }
        assertThat(entitySlot.captured.household).isEqualTo(testHousehold)
        assertThat(entitySlot.captured.contentType).isEqualTo("application/pdf")
        assertThat(entitySlot.captured.storagePath).isEqualTo("/documents/100/stored.pdf")
        verify { documentStorageService.store(100L, "proof.pdf", file.bytes) }
    }

    @Test
    fun `upload document - with person`() {
        val file = MockMultipartFile("file", "enrollment.png", "image/png", "test-content".toByteArray())

        val result = service.uploadDocument(100L, 5L, DocumentType.OTHER, file)

        assertThat(result.personId).isEqualTo(5L)
    }

    @Test
    fun `upload document - household not found`() {
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", "test-content".toByteArray())
        every { householdRepository.findByHouseholdId(999L) } returns null

        assertThrows<NotFoundException> {
            service.uploadDocument(999L, null, DocumentType.PROOF_OF_INCOME, file)
        }
    }

    @Test
    fun `upload document - person not in household`() {
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", "test-content".toByteArray())

        assertThrows<NotFoundException> {
            service.uploadDocument(100L, 999L, DocumentType.PROOF_OF_INCOME, file)
        }
    }

    @Test
    fun `upload document - empty file rejected`() {
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", ByteArray(0))

        assertThrows<BusinessRuleException> {
            service.uploadDocument(100L, null, DocumentType.PROOF_OF_INCOME, file)
        }
    }

    @Test
    fun `upload document - too large rejected`() {
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", ByteArray(26 * 1024 * 1024))

        val exception = assertThrows<BusinessRuleException> {
            service.uploadDocument(100L, null, DocumentType.PROOF_OF_INCOME, file)
        }
        assertThat(exception.message).contains("Datei ist zu groß (max. 25 MB)!")
    }

    /**
     * The limit is configuration, not a constant - it is what an installation whose scans come out
     * larger than expected has to be able to raise, and the message has to name the limit that was
     * actually applied.
     */
    @Test
    fun `upload document - the configured limit is what is enforced`() {
        tafelAdminProperties.storage.maxDocumentSize = DataSize.ofMegabytes(1)
        val file = MockMultipartFile("file", "proof.pdf", "application/pdf", ByteArray(2 * 1024 * 1024))

        val exception = assertThrows<BusinessRuleException> {
            service.uploadDocument(100L, null, DocumentType.PROOF_OF_INCOME, file)
        }
        assertThat(exception.message).contains("Datei ist zu groß (max. 1 MB)!")
    }

    @Test
    fun `upload document - unsupported content type rejected`() {
        val file = MockMultipartFile("file", "proof.txt", "text/plain", "test-content".toByteArray())

        assertThrows<BusinessRuleException> {
            service.uploadDocument(100L, null, DocumentType.PROOF_OF_INCOME, file)
        }
    }

    @Test
    fun `get documents`() {
        val entity = DocumentEntity(
            household = testHousehold,
            documentType = at.wrk.tafel.admin.backend.database.model.household.DocumentType.ID,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis.jpg",
        ).apply {
            id = 7
            createdAt = LocalDateTime.now()
        }
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100L) } returns listOf(entity)

        val result = service.getDocuments(100L)

        assertThat(result).hasSize(1)
        assertThat(result[0].id).isEqualTo(7L)
        assertThat(result[0].documentType).isEqualTo(DocumentType.ID)
        assertThat(result[0].fileName).isEqualTo("ausweis.jpg")
    }

    @Test
    fun `get document file - successful`() {
        val entity = DocumentEntity(
            household = testHousehold,
            documentType = at.wrk.tafel.admin.backend.database.model.household.DocumentType.ID,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis.jpg",
        ).apply { id = 7 }
        every { documentRepository.findByIdAndHouseholdHouseholdId(7L, 100L) } returns entity
        every { documentStorageService.read("/documents/100/ausweis.jpg") } returns "bytes".toByteArray()

        val result = service.getDocumentFile(100L, 7L)

        assertThat(result.fileName).isEqualTo("ausweis.jpg")
        assertThat(result.contentType).isEqualTo("image/jpeg")
        assertThat(result.bytes).isEqualTo("bytes".toByteArray())

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Document")
        assertThat(entrySlot.captured.entityId).isEqualTo(7L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `get document file - not found`() {
        every { documentRepository.findByIdAndHouseholdHouseholdId(any(), any()) } returns null

        assertThrows<NotFoundException> {
            service.getDocumentFile(100L, 999L)
        }
    }

    @Test
    fun `delete document - successful`() {
        val entity = DocumentEntity(
            household = testHousehold,
            documentType = at.wrk.tafel.admin.backend.database.model.household.DocumentType.ID,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis.jpg",
        ).apply { id = 7 }
        every { documentRepository.findByIdAndHouseholdHouseholdId(7L, 100L) } returns entity

        service.deleteDocument(100L, 7L)

        verify { documentStorageService.delete("/documents/100/ausweis.jpg") }
        verify { documentRepository.delete(entity) }
    }

    @Test
    fun `import from scanner file - successful`() {
        every { scannerFileService.read("scan1.pdf") } returns "scanned-content".toByteArray()
        every { scannerFileService.resolveContentType("scan1.pdf") } returns "application/pdf"

        val result = service.importFromScannerFile(100L, "scan1.pdf", null, DocumentType.OTHER)

        assertThat(result.id).isEqualTo(42L)
        // the imported document's filename is derived from the document type + import time, not
        // the scanner's own generic filename
        assertThat(result.fileName).matches("Sonstiges_\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.pdf")

        val storedFileNameSlot = slot<String>()
        verify { documentStorageService.store(eq(100L), capture(storedFileNameSlot), eq("scanned-content".toByteArray())) }
        assertThat(storedFileNameSlot.captured).matches("Sonstiges_\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.pdf")

        verify { scannerFileService.delete("scan1.pdf") }
        verify { documentScannerWatcherService.publishIfChanged() }
    }

    @Test
    fun `import from scanner file - PRIVACY_NOTICE type derives ASCII-only filename`() {
        every { scannerFileService.read("scan1.pdf") } returns "scanned-content".toByteArray()
        every { scannerFileService.resolveContentType("scan1.pdf") } returns "application/pdf"

        val result = service.importFromScannerFile(100L, "scan1.pdf", null, DocumentType.PRIVACY_NOTICE)

        assertThat(result.fileName).matches("Datenschutzerklaerung_\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.pdf")
    }

    @Test
    fun `import from scanner file - too large rejected`() {
        every { scannerFileService.read("scan1.pdf") } returns ByteArray(26 * 1024 * 1024)
        every { scannerFileService.resolveContentType("scan1.pdf") } returns "application/pdf"

        assertThrows<BusinessRuleException> {
            service.importFromScannerFile(100L, "scan1.pdf", null, DocumentType.OTHER)
        }

        verify(exactly = 0) { scannerFileService.delete(any()) }
    }
}
