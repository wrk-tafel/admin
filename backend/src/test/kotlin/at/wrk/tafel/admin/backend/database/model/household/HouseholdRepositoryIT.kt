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
import java.time.LocalDateTime

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
     * A real Postgres run rather than a mocked unit test on purpose: `findIdByUpdatedAtBetween` used
     * to be a derived-query `List<Long>` projection method, which Spring Data quietly executed as
     * `select h from Household h ...` instead of an id-only projection - passing every unit test
     * (mocked away entirely) while failing at runtime with a `ConversionFailedException` the moment a
     * distribution actually closed. Only exercising the real query against the real entity mapping
     * catches that class of bug.
     */
    @Test
    fun `findIdByUpdatedAtBetween returns ids, not entities, for households updated in the window`() {
        val insideWindow = persistHousehold()
        val outsideWindow = persistHousehold()
        testEntityManager.flush()
        testEntityManager.clear()

        val from = LocalDateTime.now().minusHours(1)
        val to = LocalDateTime.now().plusHours(1)
        setUpdatedAt(insideWindow, from.plusMinutes(1))
        setUpdatedAt(outsideWindow, from.minusDays(1))
        testEntityManager.flush()
        testEntityManager.clear()

        // other IT tests in this suite commit their own households via real HTTP-driven service
        // calls (a separate, actually-committing transaction) against the same shared Postgres
        // instance, so the window can contain households besides these two - assert containment,
        // not exclusivity
        val result = householdRepository.findIdByUpdatedAtBetween(from, to)

        assertThat(result).contains(insideWindow.id)
        assertThat(result).doesNotContain(outsideWindow.id)
    }

    /**
     * A real Postgres run rather than a mocked unit test: the exclusion clause of both
     * `findExpiredHouseholdIdsSkipLocked` and `countByValidUntilBefore`/
     * `findAllByValidUntilBeforeOrderByValidUntilAscIdAsc` (issue #3753) is a `@Query`, and an
     * earlier version of it (a fully-qualified enum literal directly in the JPQL/native text) failed
     * at application startup with a query-validation error that no mocked unit test could ever catch
     * - only actually running it against Postgres/Hibernate does.
     */
    @Test
    fun `findExpiredHouseholdIdsSkipLocked excludes a household locked for BANNED_FROM_PREMISES but includes every other one`() {
        val cutoff = LocalDate.now()
        val expiredUnlocked = persistHousehold(validUntil = cutoff.minusDays(1))
        val expiredLockedOther = persistHousehold(validUntil = cutoff.minusDays(1)).apply {
            locked = true
            lockReasonType = HouseholdLockReason.CODE_OF_CONDUCT_VIOLATION
        }
        val expiredLockedNoReasonType = persistHousehold(validUntil = cutoff.minusDays(1)).apply {
            locked = true
            lockReasonType = null
        }
        val expiredBannedFromPremises = persistHousehold(validUntil = cutoff.minusDays(1)).apply {
            locked = true
            lockReasonType = HouseholdLockReason.BANNED_FROM_PREMISES
        }
        val notExpired = persistHousehold(validUntil = cutoff.plusDays(1))
        testEntityManager.persist(expiredLockedOther)
        testEntityManager.persist(expiredLockedNoReasonType)
        testEntityManager.persist(expiredBannedFromPremises)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdRepository.findExpiredHouseholdIdsSkipLocked(cutoff)

        assertThat(result).contains(expiredUnlocked.householdId, expiredLockedOther.householdId, expiredLockedNoReasonType.householdId)
        assertThat(result).doesNotContain(expiredBannedFromPremises.householdId, notExpired.householdId)
    }

    @Test
    fun `countByValidUntilBefore and findAllByValidUntilBeforeOrderByValidUntilAscIdAsc also exclude BANNED_FROM_PREMISES`() {
        val cutoff = LocalDate.now()
        val expiredUnlocked = persistHousehold(validUntil = cutoff.minusDays(1))
        val expiredBannedFromPremises = persistHousehold(validUntil = cutoff.minusDays(1)).apply {
            locked = true
            lockReasonType = HouseholdLockReason.BANNED_FROM_PREMISES
        }
        testEntityManager.persist(expiredBannedFromPremises)
        testEntityManager.flush()
        testEntityManager.clear()

        val count = householdRepository.countByValidUntilBefore(cutoff)
        val items = householdRepository.findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(cutoff, org.springframework.data.domain.PageRequest.of(0, 100))

        assertThat(items.map { it.householdId }).contains(expiredUnlocked.householdId).doesNotContain(expiredBannedFromPremises.householdId)
        assertThat(count).isGreaterThanOrEqualTo(1)
    }

    @Test
    fun `findHouseholdIdsWithExpiredLockSkipLocked returns only locked households whose lockedUntil has passed`() {
        val today = LocalDate.now()
        val expiredLock = persistHousehold(validUntil = today.plusYears(1)).apply {
            locked = true
            lockedUntil = today.minusDays(1)
        }
        val notYetExpiredLock = persistHousehold(validUntil = today.plusYears(1)).apply {
            locked = true
            lockedUntil = today.plusDays(1)
        }
        val permanentLock = persistHousehold(validUntil = today.plusYears(1)).apply {
            locked = true
            lockedUntil = null
        }
        testEntityManager.persist(expiredLock)
        testEntityManager.persist(notYetExpiredLock)
        testEntityManager.persist(permanentLock)
        testEntityManager.flush()
        testEntityManager.clear()

        val result = householdRepository.findHouseholdIdsWithExpiredLockSkipLocked(today)

        assertThat(result).contains(expiredLock.householdId)
        assertThat(result).doesNotContain(notYetExpiredLock.householdId, permanentLock.householdId)
    }

    /**
     * `updated_at` is filled by JPA auditing on write, so testing a specific window requires updating
     * the column afterwards, the same way `StatisticsServiceIT.setRegisteredAt` does for `created_at`.
     */
    private fun setUpdatedAt(household: HouseholdEntity, updatedAt: LocalDateTime) {
        testEntityManager.entityManager
            .createNativeQuery("UPDATE households SET updated_at = :updatedAt WHERE id = :id")
            .setParameter("updatedAt", updatedAt)
            .setParameter("id", household.id)
            .executeUpdate()
    }

    /**
     * Households and persons reference each other, so the main person pointer can only be written
     * after both rows exist - the same two-step insert the application uses.
     */
    private fun persistHousehold(additionalPersons: Int = 0, validUntil: LocalDate? = null): HouseholdEntity {
        val household = createHousehold(testUser, testCountry)
        if (validUntil != null) {
            household.validUntil = validUntil
        }
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
