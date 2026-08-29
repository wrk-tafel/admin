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
import java.time.LocalDate

/**
 * `?valid=false`/`?locked=false` and friends used to apply the same positive `Specification` as
 * `?valid=true` - both merely tested whether the parameter was given at all, not its value (see
 * [HouseholdService.booleanFilterSpec]). These exercise the negated case end-to-end against a real
 * database, since a mock-based unit test never runs the actual `Specification`/`CriteriaBuilder`
 * predicate.
 */
class HouseholdServiceFilterIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdService: HouseholdService

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
    fun `valid=false returns only invalid households, not valid ones`() {
        val validHousehold = persistHousehold { validUntil = LocalDate.now().plusYears(1) }
        val invalidHousehold = persistHousehold { validUntil = LocalDate.now().minusDays(1) }
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdService.getHouseholds(page = null, filters = HouseholdSearchFilters(valid = false))

        val resultIds = result.items.mapNotNull { it.id }
        assertThat(resultIds).contains(invalidHousehold.householdId)
        assertThat(resultIds).doesNotContain(validHousehold.householdId)
    }

    @Test
    @Transactional
    fun `locked=false returns only unlocked households, not locked ones`() {
        val unlockedHousehold = persistHousehold { locked = false }
        val lockedHousehold = persistHousehold { locked = true }
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdService.getHouseholds(page = null, filters = HouseholdSearchFilters(locked = false))

        val resultIds = result.items.mapNotNull { it.id }
        assertThat(resultIds).contains(unlockedHousehold.householdId)
        assertThat(resultIds).doesNotContain(lockedHousehold.householdId)
    }

    private fun persistHousehold(customize: HouseholdEntity.() -> Unit): HouseholdEntity {
        val household = createHousehold(testUser.employee, testCountry).apply(customize)
        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }
}
