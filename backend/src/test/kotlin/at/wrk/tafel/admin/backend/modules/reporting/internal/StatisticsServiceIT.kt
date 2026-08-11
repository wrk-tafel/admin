package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.reporting.ChildAgeCountItem
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
 * `StatisticsService.childrenFilter` (today's as well as a reference date's), that
 * `totalCount` reflects the full filtered result set rather than just the current page, and that
 * the per-age-year distribution counts the same population the list does.
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
    fun `getChildrenData includes only additional persons within the age range`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 8, lastname = "InRange")
        addAdditionalPerson(household, age = 5, lastname = "TooYoung")
        addAdditionalPerson(household, age = 11, lastname = "TooOld")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)

        assertThat(result.items).hasSize(1)
        assertThat(result.items.first().lastname).isEqualTo("InRange")
        assertThat(result.items.first().householdId).isEqualTo(household.householdId)
    }

    @Test
    fun `getChildrenData includes ages at the inclusive boundaries`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 6, lastname = "AtMin")
        addAdditionalPerson(household, age = 10, lastname = "AtMax")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)

        assertThat(result.items.map { it.lastname }).containsExactlyInAnyOrder("AtMin", "AtMax")
    }

    @Test
    fun `getChildrenData excludes the main person even when their age is in range`() {
        val household = persistHousehold(mainPersonAge = 8)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)

        assertThat(result.items).isEmpty()
    }

    @Test
    fun `getChildrenData excludes households that are no longer valid`() {
        val household = persistHousehold(validUntil = LocalDate.now().minusDays(1))
        addAdditionalPerson(household, age = 8, lastname = "ExpiredHousehold")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)

        assertThat(result.items.map { it.lastname }).doesNotContain("ExpiredHousehold")
    }

    @Test
    fun `getChildrenData totalCount reflects the full result set, not just the current page`() {
        repeat(30) {
            val household = persistHousehold()
            addAdditionalPerson(household, age = 7, lastname = "Nr$it")
        }
        testEntityManager.flush()
        testEntityManager.clear()

        val firstPage = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, page = 1, pageSize = 25)
        assertThat(firstPage.items).hasSize(25)
        assertThat(firstPage.totalCount).isEqualTo(30L)
        assertThat(firstPage.totalPages).isEqualTo(2)

        val secondPage = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, page = 2, pageSize = 25)
        assertThat(secondPage.items).hasSize(5)
        assertThat(secondPage.totalCount).isEqualTo(30L)
    }

    @Test
    fun `getChildrenData measures the age as of the reference date`() {
        val household = persistHousehold()
        // Turns 6 in three months - out of range today, in range as of the reference date.
        addAdditionalPerson(household, birthDate = LocalDate.now().minusYears(6).plusMonths(3), lastname = "TurnsSixSoon")
        testEntityManager.flush()
        testEntityManager.clear()

        val today = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)
        assertThat(today.items).isEmpty()

        val atReferenceDate = statisticsService.getChildrenData(
            ageMin = 6,
            ageMax = 10,
            referenceDate = LocalDate.now().plusMonths(3),
        )
        assertThat(atReferenceDate.items).hasSize(1)
        assertThat(atReferenceDate.items.single().lastname).isEqualTo("TurnsSixSoon")
        assertThat(atReferenceDate.items.single().age).isEqualTo(6)
    }

    @Test
    fun `getChildrenAgeDistribution counts every match per age year`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 6, lastname = "Six1")
        addAdditionalPerson(household, age = 6, lastname = "Six2")
        addAdditionalPerson(household, age = 8, lastname = "Eight")
        addAdditionalPerson(household, age = 12, lastname = "OutOfRange")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenAgeDistribution(ageMin = 6, ageMax = 9)

        assertThat(result.items).containsExactly(
            ChildAgeCountItem(age = 6, count = 2),
            ChildAgeCountItem(age = 7, count = 0),
            ChildAgeCountItem(age = 8, count = 1),
            ChildAgeCountItem(age = 9, count = 0),
        )
    }

    @Test
    fun `getChildrenAgeDistribution excludes main persons and expired households`() {
        val validHousehold = persistHousehold(mainPersonAge = 8)
        addAdditionalPerson(validHousehold, age = 8, lastname = "Counted")
        val expiredHousehold = persistHousehold(validUntil = LocalDate.now().minusDays(1))
        addAdditionalPerson(expiredHousehold, age = 8, lastname = "ExpiredHousehold")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenAgeDistribution(ageMin = 8, ageMax = 8)

        assertThat(result.items).containsExactly(ChildAgeCountItem(age = 8, count = 1))
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

    private fun addAdditionalPerson(household: HouseholdEntity, age: Int, lastname: String): PersonEntity = addAdditionalPerson(household, LocalDate.now().minusYears(age.toLong()), lastname)

    private fun addAdditionalPerson(household: HouseholdEntity, birthDate: LocalDate, lastname: String): PersonEntity {
        val person = PersonEntity(household = household, country = testCountry, isMainPerson = false)
        person.firstname = "Kind"
        person.lastname = lastname
        person.birthDate = birthDate
        testEntityManager.persist(person)
        return person
    }
}
