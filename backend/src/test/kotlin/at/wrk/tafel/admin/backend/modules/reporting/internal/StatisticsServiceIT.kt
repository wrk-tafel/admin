package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
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
import java.time.LocalDateTime
import java.time.temporal.IsoFields

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
    fun `getChildrenData orders by household by default`() {
        val higherHousehold = persistHousehold()
        addAdditionalPerson(higherHousehold, age = 8, lastname = "FromHigherHousehold")
        val lowerHousehold = persistHousehold()
        addAdditionalPerson(lowerHousehold, age = 8, lastname = "FromLowerHousehold")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10)

        val expectedOrder = listOf(higherHousehold, lowerHousehold).sortedBy { it.householdId }.map { it.householdId }
        assertThat(result.items.map { it.householdId }).isEqualTo(expectedOrder)
    }

    @Test
    fun `getChildrenData sorts by the requested column, overriding the household default`() {
        val household = persistHousehold()
        val bravo = addAdditionalPerson(household, age = 8, lastname = "Bravo")
        val alpha = addAdditionalPerson(household, age = 8, lastname = "Alpha")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, sortBy = "lastname", sortDirection = "asc")

        assertThat(result.items.map { it.lastname }).containsExactly(alpha.lastname, bravo.lastname)
    }

    @Test
    fun `getChildrenData sorts by firstname when requested`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 8, lastname = "X", firstname = "Bravo")
        addAdditionalPerson(household, age = 8, lastname = "Y", firstname = "Alpha")
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, sortBy = "firstname", sortDirection = "asc")

        assertThat(result.items.map { it.firstname }).containsExactly("Alpha", "Bravo")
    }

    /** Older means an earlier birth date, so ascending age has to sort by descending birth date. */
    @Test
    fun `getChildrenData sorts by age when requested, ascending age meaning descending birthDate`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 6, lastname = "Younger")
        addAdditionalPerson(household, age = 9, lastname = "Older")
        testEntityManager.flush()
        testEntityManager.clear()

        val ascending = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, sortBy = "age", sortDirection = "asc")
        assertThat(ascending.items.map { it.lastname }).containsExactly("Younger", "Older")

        val descending = statisticsService.getChildrenData(ageMin = 6, ageMax = 10, sortBy = "age", sortDirection = "desc")
        assertThat(descending.items.map { it.lastname }).containsExactly("Older", "Younger")
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

    @Test
    fun `countBeneficiaryPersons excludes persons flagged as excluded from the household`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 8, lastname = "Counted")
        addAdditionalPerson(household, age = 8, lastname = "Excluded", excludeFromHousehold = true)
        testEntityManager.flush()
        testEntityManager.clear()

        val today = LocalDate.now()
        val result = statisticsService.countBeneficiaryPersons(today, today)

        // main person + the one non-excluded additional person - the excluded one must not add to the count
        assertThat(result.last().value.toInt()).isEqualTo(2)
    }

    @Test
    fun `countBeneficiaryCustomersWithChildren excludes a child flagged as excluded from the household`() {
        val household = persistHousehold()
        addAdditionalPerson(household, age = 8, lastname = "Excluded", excludeFromHousehold = true)
        testEntityManager.flush()
        testEntityManager.clear()

        val today = LocalDate.now()
        val result = statisticsService.countBeneficiaryCustomersWithChildren(today, today)

        assertThat(result.last().value.toInt()).isEqualTo(0)
    }

    /**
     * A household counts from the period it was registered in onwards, not for every period the
     * database has ever covered - measured as the difference the household makes to each bucket,
     * so the assertion holds whatever else the schema already contains.
     */
    @Test
    fun `a household is counted only from the period it was registered in`() {
        val fromDate = LocalDate.now().minusMonths(5).withDayOfMonth(1)
        val toDate = LocalDate.now()
        val before = statisticsService.countBeneficiaryCustomers(fromDate, toDate)

        val household = persistHousehold()
        setRegisteredAt(household, LocalDate.now().minusMonths(2).atStartOfDay())
        testEntityManager.flush()
        testEntityManager.clear()

        val after = statisticsService.countBeneficiaryCustomers(fromDate, toDate)
        val addedPerBucket = after.zip(before).map { (now, then) -> now.value.toInt() - then.value.toInt() }

        assertThat(addedPerBucket).hasSize(before.size)
        // the buckets before it registered are untouched, the ones from that month on carry it
        assertThat(addedPerBucket.take(before.size - 3)).containsOnly(0)
        assertThat(addedPerBucket.takeLast(3)).containsOnly(1)
    }

    /**
     * The timeline buckets whole weeks and months, but the series it makes of them has to describe
     * the range that was asked for and nothing besides: it reaches the last day of the range, and
     * no bucket collects a distribution that lies outside it. Both are what makes a period
     * comparable with the one before it - see `R__00101_statistics_timeline_bounds.sql`.
     */
    @Test
    fun `the timeline covers the requested range up to its last day`() {
        val toDate = LocalDate.now()
        val results = statisticsService.countBeneficiaryCustomers(toDate.withDayOfMonth(1), toDate)

        val expectedLastLabel = "%d-KW%02d".format(
            toDate.get(IsoFields.WEEK_BASED_YEAR),
            toDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR),
        )
        assertThat(results.last().label).isEqualTo(expectedLastLabel)
    }

    @Test
    fun `a distribution after the requested range is not counted towards its last bucket`() {
        // a range ending mid-month, and a distribution held later in that same month
        val fromDate = LocalDate.now().withDayOfMonth(1).minusMonths(4)
        val toDate = LocalDate.now().withDayOfMonth(10)
        val before = statisticsService.countShelters(fromDate, toDate)

        persistShelterStatistic(distributionDate = toDate.plusDays(5))
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(statisticsService.countShelters(fromDate, toDate)).isEqualTo(before)

        // the very same distribution does count once the range reaches it
        val widerRange = statisticsService.countShelters(fromDate, toDate.plusDays(6))
        assertThat(widerRange.sumOf { it.value.toInt() }).isEqualTo(before.sumOf { it.value.toInt() } + 1)
    }

    /**
     * A distribution that served no shelter at all still has to count in the average's divisor -
     * otherwise the figure only reflects the distributions that happened to have a shelter, and
     * reads far too high.
     *
     * Deliberately a future date, not [LocalDate.now]: the shared Testcontainers database (see
     * `TafelBaseIntegrationTest`) outlives this test's own rolled-back transaction, and
     * `DistributionConcurrentCreateIT` commits a real, statistic-bearing distribution dated *today*
     * outside any transaction (it has to, to exercise real concurrent locking) - which would
     * silently join this bucket's divisor and break the exact 0.5 asserted below whenever both
     * tests run in the same suite.
     */
    @Test
    fun `averageShelters divides by every distribution in range, including ones without shelters`() {
        val distributionDate = LocalDate.now().plusYears(1)

        persistShelterStatistic(distributionDate = distributionDate)

        val distributionWithoutShelter = createDistribution(testUser)
        distributionWithoutShelter.startedAt = distributionDate.atTime(9, 0)
        distributionWithoutShelter.endedAt = distributionDate.atTime(11, 0)
        testEntityManager.persist(distributionWithoutShelter)
        testEntityManager.persist(DistributionStatisticEntity(distribution = distributionWithoutShelter))
        testEntityManager.flush()
        testEntityManager.clear()

        val result = statisticsService.averageShelters(distributionDate, distributionDate)

        // one shelter served across two distributions in the bucket
        assertThat(result.last().value.toDouble()).isEqualTo(0.5)
    }

    private fun persistShelterStatistic(distributionDate: LocalDate) {
        val distribution = createDistribution(testUser)
        distribution.startedAt = distributionDate.atTime(13, 0)
        distribution.endedAt = distributionDate.atTime(18, 0)
        testEntityManager.persist(distribution)

        val statistic = DistributionStatisticEntity(distribution = distribution)
        statistic.shelters = mutableListOf(
            DistributionStatisticShelterEntity(
                statistic = statistic,
                name = "Notschlafstelle",
                addressStreet = "Erdberg",
                addressHouseNumber = "1",
                addressPostalCode = 1030,
                addressCity = "Wien",
                personsCount = 40,
            ),
        )
        testEntityManager.persist(statistic)
    }

    /**
     * `createdAt` is filled by JPA auditing on insert, so a household that registered in the past
     * can only be written by updating the column afterwards.
     */
    private fun setRegisteredAt(household: HouseholdEntity, registeredAt: LocalDateTime) {
        testEntityManager.entityManager
            .createNativeQuery("UPDATE households SET created_at = :createdAt WHERE id = :id")
            .setParameter("createdAt", registeredAt)
            .setParameter("id", household.id)
            .executeUpdate()
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

    private fun addAdditionalPerson(
        household: HouseholdEntity,
        age: Int,
        lastname: String,
        excludeFromHousehold: Boolean = false,
        firstname: String = "Kind",
    ): PersonEntity = addAdditionalPerson(household, LocalDate.now().minusYears(age.toLong()), lastname, excludeFromHousehold, firstname)

    private fun addAdditionalPerson(
        household: HouseholdEntity,
        birthDate: LocalDate,
        lastname: String,
        excludeFromHousehold: Boolean = false,
        firstname: String = "Kind",
    ): PersonEntity {
        val person = PersonEntity(household = household, country = testCountry, isMainPerson = false)
        person.firstname = firstname
        person.lastname = lastname
        person.birthDate = birthDate
        person.excludeFromHousehold = excludeFromHousehold
        testEntityManager.persist(person)
        return person
    }
}
