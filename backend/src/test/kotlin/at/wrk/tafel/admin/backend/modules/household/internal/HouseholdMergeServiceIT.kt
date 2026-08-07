package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeField
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeFieldSelectionItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.boot.jpa.test.autoconfigure.find
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate

class HouseholdMergeServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdMergeService: HouseholdMergeService

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    @Transactional
    fun `same-distribution collision keeps the target's ticket number and folds the flags`() {
        val distribution = createDistribution(testUser).also { testEntityManager.persist(it) }

        val target = persistHousehold()
        val source = persistHousehold()

        createDistributionHouseholdEntity(target, distribution, ticketNumber = 5, processed = false, costContributionPaid = true)
        createDistributionHouseholdEntity(source, distribution, ticketNumber = 9, processed = true, costContributionPaid = false)

        flushAndClear()

        householdMergeService.merge(target.householdId!!, HouseholdMergeRequest(sourceHouseholdIds = listOf(source.householdId!!)))

        flushAndClear()

        val remaining = distributionHouseholdRepository.findByDistributionId(distribution.id!!)
        assertThat(remaining).hasSize(1)
        val survivor = remaining.single()
        assertThat(survivor.household.householdId).isEqualTo(target.householdId)
        assertThat(survivor.ticketNumber).isEqualTo(5) // target's own ticket, never overwritten
        assertThat(survivor.processed).isTrue() // OR-folded from the source's processed=true
        assertThat(survivor.costContributionPaid).isFalse() // AND-folded from the source's unpaid=false
    }

    @Test
    @Transactional
    fun `two sources colliding on a distribution with no target row - lowest source row wins`() {
        val distribution = createDistribution(testUser).also { testEntityManager.persist(it) }

        val target = persistHousehold()
        val source1 = persistHousehold()
        val source2 = persistHousehold()

        val source1Row = createDistributionHouseholdEntity(source1, distribution, ticketNumber = 3, processed = false, costContributionPaid = true)
        createDistributionHouseholdEntity(source2, distribution, ticketNumber = 7, processed = true, costContributionPaid = true)

        flushAndClear()

        householdMergeService.merge(
            target.householdId!!,
            HouseholdMergeRequest(sourceHouseholdIds = listOf(source1.householdId!!, source2.householdId!!)),
        )

        flushAndClear()

        val remaining = distributionHouseholdRepository.findByDistributionId(distribution.id!!)
        assertThat(remaining).hasSize(1)
        val survivor = remaining.single()
        assertThat(survivor.household.householdId).isEqualTo(target.householdId)
        assertThat(survivor.id).isEqualTo(source1Row.id) // lowest-id row wins
        assertThat(survivor.ticketNumber).isEqualTo(3)
        assertThat(survivor.processed).isTrue() // OR-folded from source2
        assertThat(survivor.costContributionPaid).isTrue()
    }

    @Test
    @Transactional
    fun `distribution attendance for distinct distributions is simply moved, not collided`() {
        val distribution1 = createDistribution(testUser).also { testEntityManager.persist(it) }
        val distribution2 = createDistribution(testUser).also { testEntityManager.persist(it) }

        val target = persistHousehold()
        val source = persistHousehold()

        createDistributionHouseholdEntity(target, distribution1, ticketNumber = 1, processed = false, costContributionPaid = true)
        createDistributionHouseholdEntity(source, distribution2, ticketNumber = 2, processed = false, costContributionPaid = true)

        flushAndClear()

        householdMergeService.merge(target.householdId!!, HouseholdMergeRequest(sourceHouseholdIds = listOf(source.householdId!!)))

        flushAndClear()

        val targetEntity = householdRepository.findByHouseholdId(target.householdId!!)!!
        val movedRows = distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(targetEntity.id!!))
        assertThat(movedRows).extracting<Int> { it.ticketNumber }.containsExactlyInAnyOrder(1, 2)
    }

    @Test
    @Transactional
    fun `additional persons are re-parented and deduplicated by name plus birthdate`() {
        val target = persistHousehold()
        val source = persistHousehold()

        val sharedBirthDate = LocalDate.of(1990, 5, 17)
        addPerson(target, firstname = "Anna", lastname = "Schmidt", birthDate = sharedBirthDate)
        // Same name+birthdate as the target's additional person above (different casing/whitespace) - must be dropped as a duplicate.
        addPerson(source, firstname = " anna ", lastname = "SCHMIDT", birthDate = sharedBirthDate)
        // Unique to the source - must be moved onto the target.
        addPerson(source, firstname = "Peter", lastname = "Novak", birthDate = LocalDate.of(1985, 1, 1))

        flushAndClear()

        val targetMainPersonId = householdRepository.findByHouseholdId(target.householdId!!)!!.mainPerson!!.id

        householdMergeService.merge(target.householdId!!, HouseholdMergeRequest(sourceHouseholdIds = listOf(source.householdId!!)))

        flushAndClear()

        val mergedTarget = householdRepository.findByHouseholdId(target.householdId!!)!!
        // main person untouched by the merge (invariant: the target's main person is never replaced)
        assertThat(mergedTarget.mainPerson!!.id).isEqualTo(targetMainPersonId)

        val namesOnTarget = mergedTarget.persons.map { "${it.firstname}/${it.lastname}/${it.birthDate}" }
        // 2 original target persons (main + Anna Schmidt) + Peter Novak (moved) + the source's main person
        // (moved as a non-main additional person, since its name doesn't match anyone on the target)
        assertThat(mergedTarget.persons).hasSize(4)
        assertThat(namesOnTarget).contains("Peter/Novak/1985-01-01")
        // the duplicate "anna schmidt" from the source was dropped, not moved - only one survives
        assertThat(mergedTarget.persons.count { it.firstname?.trim()?.equals("anna", ignoreCase = true) == true }).isEqualTo(1)

        val movedSourceMainPerson = mergedTarget.persons.first { it != mergedTarget.mainPerson && it.firstname != "Peter" && !it.firstname.equals("Anna", ignoreCase = true) }
        assertThat(movedSourceMainPerson.isMainPerson).isFalse()
    }

    @Test
    @Transactional
    fun `notes are re-parented onto the target`() {
        val target = persistHousehold()
        val source = persistHousehold()

        val note = HouseholdNoteEntity(household = source, note = "some note on the source household").apply {
            employee = testUser.employee
        }
        testEntityManager.persist(note)

        flushAndClear()

        householdMergeService.merge(target.householdId!!, HouseholdMergeRequest(sourceHouseholdIds = listOf(source.householdId!!)))

        flushAndClear()

        val movedNote = testEntityManager.find<HouseholdNoteEntity>(note.id!!)
        assertThat(movedNote).isNotNull
        assertThat(movedNote!!.household.householdId).isEqualTo(target.householdId)
    }

    @Test
    @Transactional
    fun `documents are re-parented, person remapped for a dropped duplicate, and the file is kept on disk`(@TempDir tempDir: Path) {
        val target = persistHousehold()
        val source = persistHousehold()

        val sharedBirthDate = LocalDate.of(1992, 3, 3)
        val targetPerson = addPerson(target, firstname = "Anna", lastname = "Schmidt", birthDate = sharedBirthDate)
        val sourceDuplicatePerson = addPerson(source, firstname = "Anna", lastname = "Schmidt", birthDate = sharedBirthDate)

        val documentFile = tempDir.resolve("document.pdf")
        Files.write(documentFile, byteArrayOf(1, 2, 3))

        val document = DocumentEntity(
            household = source,
            documentType = DocumentType.OTHER,
            fileName = "document.pdf",
            contentType = "application/pdf",
            storagePath = documentFile.toAbsolutePath().toString(),
        ).apply {
            person = sourceDuplicatePerson
        }
        testEntityManager.persist(document)

        flushAndClear()

        householdMergeService.merge(target.householdId!!, HouseholdMergeRequest(sourceHouseholdIds = listOf(source.householdId!!)))

        flushAndClear()

        val movedDocument = testEntityManager.find<DocumentEntity>(document.id!!)
        assertThat(movedDocument).isNotNull
        assertThat(movedDocument!!.household.householdId).isEqualTo(target.householdId)
        assertThat(movedDocument.person!!.id).isEqualTo(targetPerson.id)
        assertThat(Files.exists(documentFile)).isTrue()
    }

    @Test
    @Transactional
    fun `explicit field selection overrides the target, unpicked fields keep the target's value`() {
        val target = persistHousehold()
        val source = persistHousehold()

        val originalTargetAddressStreet = target.addressStreet
        val sourceTelephoneNumber = source.telephoneNumber

        flushAndClear()

        householdMergeService.merge(
            target.householdId!!,
            HouseholdMergeRequest(
                sourceHouseholdIds = listOf(source.householdId!!),
                fieldSelections = listOf(HouseholdMergeFieldSelectionItem(HouseholdMergeField.TELEPHONE_NUMBER, source.householdId)),
            ),
        )

        flushAndClear()

        val mergedTarget = householdRepository.findByHouseholdId(target.householdId!!)!!
        assertThat(mergedTarget.telephoneNumber).isEqualTo(sourceTelephoneNumber)
        assertThat(mergedTarget.addressStreet).isEqualTo(originalTargetAddressStreet) // not picked - target's value kept
    }

    @Test
    @Transactional
    fun `source households are deleted, target survives`() {
        val target = persistHousehold()
        val source1 = persistHousehold()
        val source2 = persistHousehold()

        flushAndClear()

        householdMergeService.merge(
            target.householdId!!,
            HouseholdMergeRequest(sourceHouseholdIds = listOf(source1.householdId!!, source2.householdId!!)),
        )

        flushAndClear()

        assertThat(testEntityManager.find<HouseholdEntity>(target.id!!)).isNotNull
        assertThat(testEntityManager.find<HouseholdEntity>(source1.id!!)).isNull()
        assertThat(testEntityManager.find<HouseholdEntity>(source2.id!!)).isNull()
    }

    private fun flushAndClear() {
        testEntityManager.flush()
        testEntityManager.clear()
    }

    private fun persistHousehold(): HouseholdEntity {
        val household = createHousehold(testUser.employee, testCountry)
        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }

    private fun addPerson(household: HouseholdEntity, firstname: String, lastname: String, birthDate: LocalDate): PersonEntity {
        val person = PersonEntity(household = household, country = testCountry, isMainPerson = false).apply {
            this.firstname = firstname
            this.lastname = lastname
            this.birthDate = birthDate
            gender = household.mainPerson?.gender
            income = BigDecimal.ZERO
        }
        testEntityManager.persist(person)
        return person
    }

    private fun createDistributionHouseholdEntity(
        household: HouseholdEntity,
        distribution: DistributionEntity,
        ticketNumber: Int,
        processed: Boolean,
        costContributionPaid: Boolean,
    ): DistributionHouseholdEntity {
        val distributionHouseholdEntity = DistributionHouseholdEntity(
            distribution = distribution,
            household = household,
            ticketNumber = ticketNumber,
            processed = processed,
            costContributionPaid = costContributionPaid,
        )

        testEntityManager.persist(distributionHouseholdEntity)
        return distributionHouseholdEntity
    }
}
