package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeField
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeFieldSelectionItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class HouseholdMergeServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var personRepository: PersonRepository

    @RelaxedMockK
    private lateinit var householdNoteRepository: HouseholdNoteRepository

    @RelaxedMockK
    private lateinit var documentRepository: DocumentRepository

    @RelaxedMockK
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var householdConverter: HouseholdConverter

    @RelaxedMockK
    private lateinit var householdService: HouseholdService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    @InjectMockKs
    private lateinit var service: HouseholdMergeService

    private fun testHousehold(householdId: Long, entityId: Long, firstname: String = "firstname-$householdId"): HouseholdEntity {
        val household = HouseholdEntity(householdId = householdId, validUntil = java.time.LocalDate.now()).apply {
            id = entityId
        }
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = entityId * 100
            this.firstname = firstname
            lastname = "lastname-$householdId"
        }
        household.mainPerson = mainPerson
        household.persons.add(mainPerson)
        return household
    }

    private fun mockDefaultResponse() {
        every { householdConverter.mapEntityToHousehold(any()) } returns HouseholdResponse(address = HouseholdAddress(street = null, houseNumber = null, postalCode = null, city = null))
        every { distributionHouseholdRepository.findAllByHouseholdEntityIds(any()) } returns emptyList()
        every { householdNoteRepository.countByHouseholdEntityIdIn(any()) } returns 0
        every { documentRepository.countByHouseholdIdIn(any()) } returns 0
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } answers { firstArg() }
    }

    @Test
    fun `merge with no sources throws ConflictException`() {
        assertThrows<ConflictException> {
            service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = emptyList()))
        }
    }

    @Test
    fun `merge with duplicate source ids throws ConflictException`() {
        assertThrows<ConflictException> {
            service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L, 2L)))
        }
    }

    @Test
    fun `merge with the target listed as its own source throws ConflictException`() {
        assertThrows<ConflictException> {
            service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(1L)))
        }
    }

    @Test
    fun `merge with an unknown target throws NotFoundException`() {
        every { householdRepository.findByHouseholdId(1L) } returns null

        assertThrows<NotFoundException> {
            service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L)))
        }
    }

    @Test
    fun `merge with an unknown source throws NotFoundException`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns null

        assertThrows<NotFoundException> {
            service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L)))
        }
    }

    @Test
    fun `merge with a field selection pointing at a household outside this merge throws ConflictException`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns testHousehold(2L, 20L)
        mockDefaultResponse()

        assertThrows<ConflictException> {
            service.merge(
                1L,
                HouseholdMergeRequest(
                    sourceHouseholdIds = listOf(2L),
                    fieldSelections = listOf(HouseholdMergeFieldSelectionItem(HouseholdMergeField.TELEPHONE_NUMBER, sourceHouseholdId = 999L)),
                ),
            )
        }
    }

    @Test
    fun `merge never routes field application through HouseholdConverter mapHouseholdToEntity`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns testHousehold(2L, 20L)
        mockDefaultResponse()

        service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L)))

        verify(exactly = 0) { householdConverter.mapHouseholdToEntity(any(), any()) }
        verify(exactly = 0) { householdConverter.mapHouseholdToEntity(any()) }
    }

    @Test
    fun `merge deletes every source household after re-parenting`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns testHousehold(2L, 20L)
        every { householdRepository.findByHouseholdId(3L) } returns testHousehold(3L, 30L)
        mockDefaultResponse()

        val response = service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L, 3L)))

        verify(exactly = 1) { householdService.deleteHouseholdByHouseholdId(2L) }
        verify(exactly = 1) { householdService.deleteHouseholdByHouseholdId(3L) }
        assertThat(response.deletedHouseholdIds).containsExactlyInAnyOrder(2L, 3L)
    }

    /**
     * The re-parenting above happens entirely in bulk `@Modifying` queries, which Hibernate's
     * flush-time events never see - so a merge is only in the audit trail because this service puts
     * it there. Nothing else fails if it stops doing so, which is exactly why it is asserted here.
     */
    @Test
    fun `merge reports to the audit trail what the bulk queries moved`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns testHousehold(2L, 20L)
        mockDefaultResponse()

        service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L)))

        val entries = mutableListOf<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entries)) }

        val targetSummary = entries.single { it.entityType == "Household" && it.businessKey == "1" }
        assertThat(targetSummary.operation).isEqualTo(AuditOperation.UPDATE)
        assertThat(targetSummary.changedFields).containsKeys("mergedFromHouseholds", "movedPersons", "movedNotes")

        val sourceEntry = entries.single { it.entityType == "Household" && it.businessKey == "2" }
        assertThat(sourceEntry.changedFields["mergedIntoHousehold"]).containsExactly(2L, 1L)
    }

    /**
     * Regression test for issue #3447: notes/documents used to be summarised as a count on the
     * target's audit entry only, which could not say which note/document came from which source.
     */
    @Test
    fun `merge reports one audit entry per moved note and document`() {
        val source = testHousehold(2L, 20L)
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns source
        mockDefaultResponse()

        val note = HouseholdNoteEntity(household = source, note = "note").apply { id = 501L }
        every { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(2L) } returns listOf(note)

        val document = DocumentEntity(
            household = source,
            documentType = DocumentType.OTHER,
            fileName = "file.pdf",
            contentType = "application/pdf",
            storagePath = "path",
        ).apply { id = 601L }
        every { documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(2L) } returns listOf(document)

        service.merge(1L, HouseholdMergeRequest(sourceHouseholdIds = listOf(2L)))

        val entries = mutableListOf<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entries)) }

        val noteEntry = entries.single { it.entityType == "HouseholdNote" }
        assertThat(noteEntry.entityId).isEqualTo(501L)
        assertThat(noteEntry.businessKey).isEqualTo("1")
        assertThat(noteEntry.changedFields["household"]).containsExactly(2L, 1L)

        val documentEntry = entries.single { it.entityType == "Document" }
        assertThat(documentEntry.entityId).isEqualTo(601L)
        assertThat(documentEntry.businessKey).isEqualTo("1")
        assertThat(documentEntry.changedFields["household"]).containsExactly(2L, 1L)
    }

    @Test
    fun `preview returns the plan without persisting anything`() {
        every { householdRepository.findByHouseholdId(1L) } returns testHousehold(1L, 10L)
        every { householdRepository.findByHouseholdId(2L) } returns testHousehold(2L, 20L, firstname = "differing-firstname")
        mockDefaultResponse()

        val response = service.preview(1L, listOf(2L))

        assertThat(response.fieldConflicts).extracting<HouseholdMergeField> { it.field }
            .contains(HouseholdMergeField.MAIN_PERSON_FIRSTNAME)
        assertThat(response.sources).hasSize(1)
        verify(exactly = 0) { householdRepository.saveAndFlush(any<HouseholdEntity>()) }
        verify(exactly = 0) { householdService.deleteHouseholdByHouseholdId(any()) }
        verify {
            auditLogWriter.record(
                AuditLogWriter.PendingEntry(
                    entityType = AuditScope.HOUSEHOLD_MERGE_PREVIEW_ENTITY_TYPE,
                    entityId = null,
                    businessKey = "targetHouseholdId=1;sourceHouseholdIds=2",
                    operation = AuditOperation.READ,
                    changedFields = emptyMap(),
                ),
            )
        }
    }

    @Test
    fun `preview with an unknown target throws NotFoundException`() {
        every { householdRepository.findByHouseholdId(1L) } returns null

        assertThrows<NotFoundException> {
            service.preview(1L, listOf(2L))
        }
    }

    @Test
    fun `merge applies an explicit field selection onto the target before saving it`() {
        val target = testHousehold(1L, 10L)
        val source = testHousehold(2L, 20L).apply { telephoneNumber = "999" }
        every { householdRepository.findByHouseholdId(1L) } returns target
        every { householdRepository.findByHouseholdId(2L) } returns source
        mockDefaultResponse()

        service.merge(
            1L,
            HouseholdMergeRequest(
                sourceHouseholdIds = listOf(2L),
                fieldSelections = listOf(HouseholdMergeFieldSelectionItem(HouseholdMergeField.TELEPHONE_NUMBER, sourceHouseholdId = 2L)),
            ),
        )

        assertThat(target.telephoneNumber).isEqualTo("999")
        verify(exactly = 1) { householdRepository.saveAndFlush(target) }
    }
}
