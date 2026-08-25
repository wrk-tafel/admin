package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.PersonGender
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteItem
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteService
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.zip.ZipInputStream

@ExtendWith(MockKExtension::class)
internal class HouseholdExportServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var householdConverter: HouseholdConverter

    @RelaxedMockK
    private lateinit var householdNoteService: HouseholdNoteService

    @RelaxedMockK
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var documentRepository: DocumentRepository

    @RelaxedMockK
    private lateinit var documentStorageService: DocumentStorageService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-25T10:00:00Z"), ZoneId.of("UTC"))

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()

    @InjectMockKs
    private lateinit var service: HouseholdExportService

    private fun testHouseholdEntityWithMainPerson(): HouseholdEntity {
        val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now()).apply { id = 42 }
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 1
            firstname = "max"
            lastname = "mustermann"
        }
        household.persons = mutableListOf(mainPerson)
        household.mainPerson = mainPerson
        return household
    }

    @Test
    fun `export household - not found`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        val result = service.exportHousehold(1)

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `export household - zips the data html and every uploaded file, deduplicating identical filenames`() {
        val household = testHouseholdEntityWithMainPerson()
        val householdResponse = HouseholdResponse(
            id = 100,
            address = HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1010, city = "Wien"),
            persons = listOf(
                Person(
                    isMainPerson = true,
                    firstname = "max",
                    lastname = "mustermann",
                    birthDate = LocalDate.of(1990, 1, 1),
                    gender = PersonGender.MALE,
                    country = CountryItem(id = 1, code = "AT", name = "Österreich"),
                ),
            ),
        )
        val notes = listOf(HouseholdNoteItem(id = 1, author = "test", timestamp = LocalDateTime.now(), note = "note"))

        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now().minusDays(1), startedByUser = testUserEntity).apply {
            id = 5
            endedAt = LocalDateTime.now()
        }
        val attendance = DistributionHouseholdEntity(
            distribution = distributionEntity,
            household = household,
            ticketNumber = 7,
            processed = true,
            costContributionPaid = false,
        ).apply { id = 9 }

        val document1 = DocumentEntity(
            household = household,
            documentType = DocumentType.ID,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis-1.jpg",
        ).apply { id = 1 }
        val document2 = DocumentEntity(
            household = household,
            documentType = DocumentType.PROOF_OF_INCOME,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis-2.jpg",
        ).apply { id = 2 }

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household) } returns householdResponse
        every { householdNoteService.getAllNotes(100) } returns notes
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns listOf(attendance)
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns listOf(document1, document2)
        every { documentStorageService.read("/documents/100/ausweis-1.jpg") } returns "content-1".toByteArray()
        every { documentStorageService.read("/documents/100/ausweis-2.jpg") } returns "content-2".toByteArray()

        val result = service.exportHousehold(100)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("datenexport-100-mustermann-max.zip")

        val entries = mutableMapOf<String, ByteArray>()
        ZipInputStream(result!!.bytes.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries[entry.name] = zip.readBytes()
                entry = zip.nextEntry
            }
        }
        assertThat(entries).hasSize(4)
        assertThat(entries["ausweis.jpg"]).isEqualTo("content-1".toByteArray())
        assertThat(entries["ausweis_2.jpg"]).isEqualTo("content-2".toByteArray())

        val html = entries["haushaltsdaten.html"]?.decodeToString()
        assertThat(html).isNotNull
        assertThat(html).contains("<html")
        assertThat(html).contains("mustermann max")
        assertThat(html).contains("1010 Wien")
        assertThat(html).contains("note")
        assertThat(html).contains("ausweis.jpg")

        val pdf = entries["datenexport.pdf"]
        assertThat(pdf).isNotNull
        assertThat(String(pdf!!.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.entityId).isEqualTo(42L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export household - no documents zips only the data html and pdf`() {
        val household = testHouseholdEntityWithMainPerson()
        val householdResponse = HouseholdResponse(
            id = 100,
            address = HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1010, city = "Wien"),
        )

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household) } returns householdResponse
        every { householdNoteService.getAllNotes(100) } returns emptyList()
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns emptyList()
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns emptyList()

        val result = service.exportHousehold(100)

        assertThat(result).isNotNull
        val entries = mutableListOf<String>()
        ZipInputStream(result!!.bytes.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries.add(entry.name)
                entry = zip.nextEntry
            }
        }
        assertThat(entries).containsExactly("haushaltsdaten.html", "datenexport.pdf")
    }

    @Test
    fun `export household - escapes user-provided text in the data html`() {
        val household = testHouseholdEntityWithMainPerson()
        val householdResponse = HouseholdResponse(
            id = 100,
            address = HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1010, city = "Wien"),
            locked = true,
            lockReason = "<script>alert('x')</script>",
        )
        val notes = listOf(
            HouseholdNoteItem(id = 1, author = "<b>tester</b>", timestamp = LocalDateTime.now(), note = "<script>alert(1)</script>"),
        )

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household) } returns householdResponse
        every { householdNoteService.getAllNotes(100) } returns notes
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns emptyList()
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns emptyList()

        val result = service.exportHousehold(100)

        val html = ZipInputStream(result!!.bytes.inputStream()).use { zip ->
            zip.nextEntry
            zip.readBytes().decodeToString()
        }
        assertThat(html).doesNotContain("<script>")
        assertThat(html).contains("&lt;script&gt;")
    }
}
