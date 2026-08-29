package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdDuplicateDismissalRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

class HouseholdDuplicationServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdDuplicationService: HouseholdDuplicationService

    @Autowired
    private lateinit var householdService: HouseholdService

    @Autowired
    private lateinit var householdDuplicateDismissalRepository: HouseholdDuplicateDismissalRepository

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
    fun `a duplicate pair is surfaced exactly once, not once per direction`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")
        val household2 = persistHousehold(firstname = "Marie", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdDuplicationService.findDuplicates(page = null)

        assertThat(result.totalCount).isEqualTo(1)
        assertThat(result.items).hasSize(1)

        val item = result.items.single()
        val idsInResult = listOf(item.household.id) + item.similarHouseholds.map { it.id }
        assertThat(idsInResult).containsExactlyInAnyOrder(household1.householdId, household2.householdId)
    }

    @Test
    @Transactional
    fun `a dismissed pair no longer shows up as a duplicate`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")
        val household2 = persistHousehold(firstname = "Marie", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        householdDuplicationService.dismiss(household1.householdId, household2.householdId)

        val result = householdDuplicationService.findDuplicates(page = null)

        assertThat(result.totalCount).isEqualTo(0)
        assertThat(result.items).isEmpty()
    }

    @Test
    @Transactional
    fun `dismissing a pair is idempotent regardless of argument order`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")
        val household2 = persistHousehold(firstname = "Marie", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        householdDuplicationService.dismiss(household1.householdId, household2.householdId)
        householdDuplicationService.dismiss(household2.householdId, household1.householdId)

        val result = householdDuplicationService.findDuplicates(page = null)

        assertThat(result.totalCount).isEqualTo(0)
    }

    @Test
    @Transactional
    fun `deleting a household cascades to its duplicate dismissals`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")
        val household2 = persistHousehold(firstname = "Marie", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        householdDuplicationService.dismiss(household1.householdId, household2.householdId)

        householdService.deleteHouseholdByHouseholdId(household1.householdId)
        testEntityManager.flush()

        val low = minOf(household1.householdId, household2.householdId)
        val high = maxOf(household1.householdId, household2.householdId)
        assertThat(householdDuplicateDismissalRepository.existsByHouseholdIdLowAndHouseholdIdHigh(low, high)).isFalse()
    }

    @Test
    @Transactional
    fun `findPotentialDuplicates - main person name+address match is found`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdDuplicationService.findPotentialDuplicates(
            mainPersonFirstname = "Marie",
            mainPersonLastname = "Huber",
            addressStreet = "Hauptstraße",
            addressHouseNumber = "5",
            addressDoor = null,
            persons = emptyList(),
            excludeHouseholdId = null,
        )

        assertThat(result).hasSize(1)
        assertThat(result.single().householdId).isEqualTo(household1.householdId)
    }

    @Test
    @Transactional
    fun `findPotentialDuplicates - excludes the household itself on update`() {
        val household1 = persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdDuplicationService.findPotentialDuplicates(
            mainPersonFirstname = "Maria",
            mainPersonLastname = "Huber",
            addressStreet = "Hauptstraße",
            addressHouseNumber = "5",
            addressDoor = null,
            persons = emptyList(),
            excludeHouseholdId = household1.householdId,
        )

        assertThat(result).isEmpty()
    }

    @Test
    @Transactional
    fun `findPotentialDuplicates - person-level match ignores address`() {
        val household1 = persistHousehold(firstname = "Karl", lastname = "Berger", street = "Hauptstraße", houseNumber = "5")
        val duplicatePersonBirthDate = LocalDate.now().minusYears(10)
        val additionalPerson = PersonEntity(household = household1, country = testCountry, isMainPerson = false).apply {
            firstname = "Anna"
            lastname = "Berger"
            birthDate = duplicatePersonBirthDate
        }
        household1.persons.add(additionalPerson)
        testEntityManager.persist(household1)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdDuplicationService.findPotentialDuplicates(
            mainPersonFirstname = "Someone",
            mainPersonLastname = "Else",
            addressStreet = "A completely different street",
            addressHouseNumber = "99",
            addressDoor = null,
            persons = listOf(PersonNameAndBirthDate(firstname = "Anna", lastname = "Berger", birthDate = duplicatePersonBirthDate)),
            excludeHouseholdId = null,
        )

        assertThat(result).hasSize(1)
        assertThat(result.single().householdId).isEqualTo(household1.householdId)
    }

    @Test
    @Transactional
    fun `findPotentialDuplicates - no match returns empty`() {
        persistHousehold(firstname = "Maria", lastname = "Huber", street = "Hauptstraße", houseNumber = "5")

        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdDuplicationService.findPotentialDuplicates(
            mainPersonFirstname = "Completely",
            mainPersonLastname = "Different",
            addressStreet = "Nirgendwo",
            addressHouseNumber = "1",
            addressDoor = null,
            persons = emptyList(),
            excludeHouseholdId = null,
        )

        assertThat(result).isEmpty()
    }

    private fun persistHousehold(firstname: String, lastname: String, street: String, houseNumber: String): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry).apply {
            addressStreet = street
            addressHouseNumber = houseNumber
            persons.first { it.isMainPerson }.apply {
                this.firstname = firstname
                this.lastname = lastname
            }
        }
        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }
}
