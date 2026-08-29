package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
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
import tools.jackson.databind.json.JsonMapper
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
    private lateinit var householdNoteRepository: HouseholdNoteRepository

    @RelaxedMockK
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var documentRepository: DocumentRepository

    @RelaxedMockK
    private lateinit var documentStorageService: DocumentStorageService

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-25T10:00:00Z"), ZoneId.of("UTC"))

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()

    private val jsonMapper: JsonMapper = JsonMapper.builder().build()

    @InjectMockKs
    private lateinit var service: HouseholdExportService

    private fun testHouseholdEntityWithMainPerson(): HouseholdEntity {
        val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now()).apply {
            id = 42
            updatedBy = testUserEntity.id
        }
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 1
            firstname = "max"
            lastname = "mustermann"
            updatedBy = testUserEntity.id
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
    fun `export household - zips the data pdf, the data json and every uploaded file, deduplicating identical filenames`() {
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
        val notes = listOf(
            HouseholdNoteEntity(household = household, note = "note").apply {
                id = 1
                createdAt = LocalDateTime.now()
                employee = testUserEntity.employee
                updatedBy = testUserEntity.id
            },
        )

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
        ).apply {
            id = 1
            person = household.mainPerson
            uploadedByUser = testUserEntity
        }
        val document2 = DocumentEntity(
            household = household,
            documentType = DocumentType.PROOF_OF_INCOME,
            fileName = "ausweis.jpg",
            contentType = "image/jpeg",
            storagePath = "/documents/100/ausweis-2.jpg",
        ).apply { id = 2 }

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household, any()) } returns householdResponse
        every { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(100) } returns notes
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns listOf(attendance)
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns listOf(document1, document2)
        every { documentStorageService.read("/documents/100/ausweis-1.jpg") } returns "content-1".toByteArray()
        every { documentStorageService.read("/documents/100/ausweis-2.jpg") } returns "content-2".toByteArray()
        every { userRepository.findAllById(listOf(testUserEntity.id!!)) } returns listOf(testUserEntity)

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

        val pdf = entries["datenexport.pdf"]
        assertThat(pdf).isNotNull
        assertThat(String(pdf!!.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        val json = entries["daten.json"]
        assertThat(json).isNotNull
        val jsonNode = jsonMapper.readTree(json)
        assertThat(jsonNode.get("householdId").asLong()).isEqualTo(100)
        assertThat(jsonNode.get("persons").get(0).get("name").asString()).isEqualTo("mustermann max")
        assertThat(jsonNode.get("notes").get(0).get("note").asString()).isEqualTo("note")
        assertThat(jsonNode.get("attendances").get(0).get("ticketNumber").asInt()).isEqualTo(7)

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.entityId).isEqualTo(42L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export household - no documents zips only the data pdf and json`() {
        val household = testHouseholdEntityWithMainPerson()
        val householdResponse = HouseholdResponse(
            id = 100,
            address = HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1010, city = "Wien"),
        )

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household, any()) } returns householdResponse
        every { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(100) } returns emptyList()
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns emptyList()
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns emptyList()
        every { userRepository.findAllById(listOf(testUserEntity.id!!)) } returns listOf(testUserEntity)

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
        assertThat(entries).containsExactlyInAnyOrder("datenexport.pdf", "daten.json")
    }
}
