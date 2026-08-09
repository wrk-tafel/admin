package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * The address columns the customer form marks required are enforced by the schema (R__00091):
 * `address_street` and `single_parent` outright, house number / postal code / city through
 * `NOT VALID` check constraints that tolerate the leftover rows from the 2023 import but reject
 * anything written from now on.
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
    fun `a household with a complete address is accepted`() {
        assertThatCode {
            persistHousehold()
            testEntityManager.flush()
        }.doesNotThrowAnyException()
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
    fun `a household without a house number is rejected`() {
        persistHousehold { addressHouseNumber = null }

        assertThatThrownBy { testEntityManager.flush() }
            .hasStackTraceContaining("households_address_housenumber_present")
    }

    @Test
    fun `a household with a blank house number is rejected`() {
        persistHousehold { addressHouseNumber = "   " }

        assertThatThrownBy { testEntityManager.flush() }
            .hasStackTraceContaining("households_address_housenumber_present")
    }

    @Test
    fun `a household without a postal code is rejected`() {
        persistHousehold { addressPostalCode = null }

        assertThatThrownBy { testEntityManager.flush() }
            .hasStackTraceContaining("households_address_postalcode_present")
    }

    @Test
    fun `a household without a city is rejected`() {
        persistHousehold { addressCity = null }

        assertThatThrownBy { testEntityManager.flush() }
            .hasStackTraceContaining("households_address_city_present")
    }

    @Test
    fun `a household without a street is rejected`() {
        persistHousehold { addressStreet = null }

        assertThatThrownBy { testEntityManager.flush() }
            .hasStackTraceContaining("address_street")
    }

    /**
     * An incomplete *person* stays writable on purpose - that is the state the "Daten
     * unvollständig" filter exists to surface, see `HouseholdEntitySpecsIT`.
     */
    @Test
    fun `a person without a birth date or gender is still accepted`() {
        val household = persistHousehold()
        val incomplete = PersonEntity(household = household, country = testCountry, isMainPerson = false).apply {
            firstname = "child-${generateRandomLong()}"
            lastname = "child-${generateRandomLong()}"
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
        mainPerson.birthDate = mainPerson.birthDate ?: LocalDate.now().minusYears(30)
        testEntityManager.persist(mainPerson)
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson

        return household
    }
}
