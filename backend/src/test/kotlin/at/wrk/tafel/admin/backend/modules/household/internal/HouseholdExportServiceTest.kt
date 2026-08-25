package at.wrk.tafel.admin.backend.modules.household.internal

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
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
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
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.LocalDateTime
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

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

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
    fun `export household - found`() {
        val household = testHouseholdEntityWithMainPerson()
        val householdResponse = HouseholdResponse(
            id = 100,
            address = HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1010, city = "Wien"),
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

        every { householdRepository.findByHouseholdId(100) } returns household
        every { householdConverter.mapEntityToHousehold(household) } returns householdResponse
        every { householdNoteService.getAllNotes(100) } returns notes
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(42L)) } returns listOf(attendance)
        every { jsonMapper.writeValueAsBytes(any()) } returns "json-bytes".toByteArray()

        val result = service.exportHousehold(100)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("datenexport-100-mustermann-max.json")
        assertThat(result?.bytes).isEqualTo("json-bytes".toByteArray())

        val exportSlot = slot<HouseholdExportResponse>()
        verify { jsonMapper.writeValueAsBytes(capture(exportSlot)) }
        assertThat(exportSlot.captured.household).isEqualTo(householdResponse)
        assertThat(exportSlot.captured.notes).isEqualTo(notes)
        assertThat(exportSlot.captured.attendances).hasSize(1)
        assertThat(exportSlot.captured.attendances[0].distributionId).isEqualTo(5L)
        assertThat(exportSlot.captured.attendances[0].distributionStartedAt).isEqualTo(distributionEntity.startedAt)
        assertThat(exportSlot.captured.attendances[0].distributionEndedAt).isEqualTo(distributionEntity.endedAt)
        assertThat(exportSlot.captured.attendances[0].ticketNumber).isEqualTo(7)
        assertThat(exportSlot.captured.attendances[0].processed).isTrue()
        assertThat(exportSlot.captured.attendances[0].costContributionPaid).isFalse()

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.entityId).isEqualTo(42L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `export documents - not found`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        val result = service.exportDocuments(1)

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `export documents - zips every uploaded file, deduplicating identical filenames`() {
        val household = testHouseholdEntityWithMainPerson()
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
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns listOf(document1, document2)
        every { documentStorageService.read("/documents/100/ausweis-1.jpg") } returns "content-1".toByteArray()
        every { documentStorageService.read("/documents/100/ausweis-2.jpg") } returns "content-2".toByteArray()

        val result = service.exportDocuments(100)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("dokumente-100-mustermann-max.zip")

        val entries = mutableMapOf<String, String>()
        ZipInputStream(result!!.bytes.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries[entry.name] = zip.readBytes().decodeToString()
                entry = zip.nextEntry
            }
        }
        assertThat(entries).hasSize(2)
        assertThat(entries["ausweis.jpg"]).isEqualTo("content-1")
        assertThat(entries["ausweis_2.jpg"]).isEqualTo("content-2")

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.entityId).isEqualTo(42L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
    }

    @Test
    fun `export documents - no documents produces an empty zip`() {
        val household = testHouseholdEntityWithMainPerson()
        every { householdRepository.findByHouseholdId(100) } returns household
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(100) } returns emptyList()

        val result = service.exportDocuments(100)

        assertThat(result).isNotNull
        var entryCount = 0
        ZipInputStream(result!!.bytes.inputStream()).use { zip ->
            while (zip.nextEntry != null) entryCount++
        }
        assertThat(entryCount).isEqualTo(0)
    }
}
