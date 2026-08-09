package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

/**
 * Which of the fields the customer form marks required are enforced by the schema, and - more
 * importantly - which are deliberately not.
 *
 * `single_parent` is (R__00091): a checkbox has no "unknown" state. The address parts and a
 * person's name, birth date and gender are not, because an incomplete household or person is a
 * state the application supports on purpose - see `HouseholdEntity.Specs.postProcessingNecessary()`
 * and the "Daten unvollständig" filter in the customer search. Constraining those columns would
 * make the rows the 2023 import left behind, and the `testdata` fixtures that mimic them,
 * impossible to write.
 */
@Transactional
class HouseholdRequiredFieldsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

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
    fun `single parent defaults to false when it is never set`() {
        val household = persistHousehold()
        testEntityManager.flush()
        testEntityManager.clear()

        val stored = testEntityManager.find(HouseholdEntity::class.java, household.id!!)

        assertThat(stored!!.singleParent).isFalse()
    }

    @Test
    fun `a household without an address is still accepted`() {
        persistHousehold {
            addressStreet = null
            addressHouseNumber = null
            addressStairway = null
            addressDoor = null
            addressPostalCode = null
            addressCity = null
        }

        assertThatCode { testEntityManager.flush() }.doesNotThrowAnyException()
    }

    @Test
    fun `a household without a telephone number is still accepted`() {
        persistHousehold { telephoneNumber = null }

        assertThatCode { testEntityManager.flush() }.doesNotThrowAnyException()
    }

    @Test
    fun `a person without a name, birth date or gender is still accepted`() {
        val household = persistHousehold()
        val incomplete = PersonEntity(household = household, country = testCountry, isMainPerson = false).apply {
            firstname = null
            lastname = null
            birthDate = null
            gender = null
        }
        household.persons.add(incomplete)
        testEntityManager.persist(incomplete)

        assertThatCode { testEntityManager.flush() }.doesNotThrowAnyException()
    }

    private fun persistHousehold(customize: HouseholdEntity.() -> Unit = {}): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry).apply(customize)
        val mainPerson = household.persons.first()

        household.persons.clear()
        testEntityManager.persist(household)

        mainPerson.household = household
        testEntityManager.persist(mainPerson)
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson

        return household
    }
}
