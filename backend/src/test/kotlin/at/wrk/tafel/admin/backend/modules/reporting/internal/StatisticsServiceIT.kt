package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
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

/**
 * Exercises the real `PersonEntity.Specs` birthDate-range/pagination query against Postgres -
 * unlike a mocked unit test, this actually verifies the age-to-birthDate boundary math in
 * `StatisticsService.schoolStarterPackageSpec` and that `totalCount` reflects the full filtered
 * result set, not just the current page.
 */
@Transactional
class StatisticsServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var statisticsService: StatisticsService

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
    fun `getSchoolStarterPackageData includes only additional persons within the age range`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 8, lastname = "InRange")
        addAdditionalPerson(household, age = 5, lastname = "TooYoung")
        addAdditionalPerson(household, age = 11, lastname = "TooOld")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10)

        assertThat(result.items).hasSize(1)
        assertThat(result.items.first().lastname).isEqualTo("InRange")
        assertThat(result.items.first().householdId).isEqualTo(household.householdId)
    }

    @Test
    fun `getSchoolStarterPackageData includes ages at the inclusive boundaries`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 6, lastname = "AtMin")
        addAdditionalPerson(household, age = 10, lastname = "AtMax")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10)

        assertThat(result.items.map { it.lastname }).containsExactlyInAnyOrder("AtMin", "AtMax")
    }

    @Test
    fun `getSchoolStarterPackageData excludes the main person even when their age is in range`() {
        val household = persistHousehold(mainPersonAge = 8)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10)

        assertThat(result.items).isEmpty()
    }

    @Test
    fun `getSchoolStarterPackageData excludes households that are no longer valid`() {
        val household = persistHousehold(validUntil = LocalDate.now().minusDays(1))
        addAdditionalPerson(household, age = 8, lastname = "ExpiredHousehold")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10)

        assertThat(result.items.map { it.lastname }).doesNotContain("ExpiredHousehold")
    }

    @Test
    fun `getSchoolStarterPackageData totalCount reflects the full result set, not just the current page`() {
        repeat(30) {
            val household = persistHousehold()
            addAdditionalPerson(household, age = 7, lastname = "Nr$it")
        }
        testEntityManager.flush()
        testEntityManager.clear()

        val firstPage = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10, page = 1)
        assertThat(firstPage.items).hasSize(25)
        assertThat(firstPage.totalCount).isEqualTo(30L)
        assertThat(firstPage.totalPages).isEqualTo(2)

        val secondPage = statisticsService.getSchoolStarterPackageData(ageMin = 6, ageMax = 10, page = 2)
        assertThat(secondPage.items).hasSize(5)
        assertThat(secondPage.totalCount).isEqualTo(30L)
    }

    private fun persistHousehold(
        validUntil: LocalDate = LocalDate.now().plusYears(1),
        mainPersonAge: Int = 30,
    ): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry)
        household.validUntil = validUntil
        household.persons.first { it.isMainPerson }.birthDate = LocalDate.now().minusYears(mainPersonAge.toLong())

        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }

    private fun addAdditionalPerson(household: HouseholdEntity, age: Int, lastname: String): PersonEntity {
        val person = PersonEntity()
        person.household = household
        person.isMainPerson = false
        person.firstname = "Kind"
        person.lastname = lastname
        person.birthDate = LocalDate.now().minusYears(age.toLong())
        person.country = testCountry
        testEntityManager.persist(person)
        return person
    }
}
