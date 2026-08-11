package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Root
import org.assertj.core.api.Assertions.assertThat
import org.hibernate.Hibernate
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Transactional
class HouseholdRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    /**
     * `HouseholdService.getHouseholdsAboveLimit()` reads every household's persons, for every valid
     * household - so a lazily loaded collection there means one extra query per household. The
     * eager fetch is what the `@EntityGraph` on this overload buys, and losing it is invisible
     * without this test: everything still returns the right answer, only far more slowly.
     */
    @Test
    fun `findAll with a sort fetches the persons eagerly and returns each household once`() {
        val first = persistHousehold()
        val second = persistHousehold(additionalPersons = 2)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdRepository.findAll(
            householdIdIn(listOf(first.householdId, second.householdId)),
            Sort.by(Sort.Direction.DESC, "id"),
        )

        assertThat(result.map { it.householdId }).containsExactly(second.householdId, first.householdId)
        assertThat(result).allSatisfy { assertThat(Hibernate.isInitialized(it.persons)).isTrue() }
        assertThat(result.first().persons).hasSize(3)
    }

    private fun householdIdIn(householdIds: List<Long>): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, _: CriteriaBuilder ->
        root.get<Long>("householdId").`in`(householdIds)
    }

    /**
     * Households and persons reference each other, so the main person pointer can only be written
     * after both rows exist - the same two-step insert the application uses.
     */
    private fun persistHousehold(additionalPersons: Int = 0): HouseholdEntity {
        val household = createHousehold(testUser.employee, testCountry)
        repeat(additionalPersons) { index ->
            household.persons.add(
                PersonEntity(household = household, country = testCountry, isMainPerson = false).apply {
                    firstname = "child-$index"
                    lastname = "lastname-$index"
                    birthDate = LocalDate.now().minusYears(5)
                },
            )
        }

        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }
}
