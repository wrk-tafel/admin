package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

class HouseholdDuplicationServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdDuplicationService: HouseholdDuplicationService

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
