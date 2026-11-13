package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import jakarta.persistence.EntityManagerFactory
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.hibernate.SessionFactory
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

/**
 * The frequent distribution requests read one ticket or a count - against the real queries, and
 * bounded by what Hibernate actually loads, since a mocked repository can't tell a single-row read
 * from one that loads the day's whole list.
 */
@Transactional
class DistributionTicketQueriesIT : TafelBaseIntegrationTest() {

    companion object {
        private const val TICKETS_OF_THE_DAY = 6
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var entityManagerFactory: EntityManagerFactory

    @Autowired
    private lateinit var repository: DistributionHouseholdRepository

    @Autowired
    private lateinit var distributionService: DistributionService

    @Autowired
    private lateinit var dashboardService: DashboardService

    private lateinit var distribution: DistributionEntity
    private lateinit var tickets: List<DistributionHouseholdEntity>
    private lateinit var country: CountryEntity

    private val statistics get() = entityManagerFactory.unwrap(SessionFactory::class.java).statistics

    @BeforeEach
    fun beforeEach() {
        val user = testEntityManager.persist(createUser())
        country = testEntityManager.persist(createCountry())
        distribution = testEntityManager.persist(createDistribution(user))

        tickets = (1..TICKETS_OF_THE_DAY).map { number ->
            val household = createHousehold(user, country)
            testEntityManager.persist(household)
            household.mainPerson = household.persons.first { it.isMainPerson }
            testEntityManager.persist(
                DistributionHouseholdEntity(
                    distribution = distribution,
                    household = household,
                    ticketNumber = number,
                    processed = number <= 2,
                ),
            )
        }
        testEntityManager.flush()
    }

    @AfterEach
    fun afterEach() {
        statistics.isStatisticsEnabled = false
    }

    @Test
    fun `finds one ticket by its number and by its household's business number`() {
        val ticket = tickets[3]

        assertThat(repository.findByDistributionIdAndTicketNumber(distribution.id!!, 4)?.id).isEqualTo(ticket.id)
        assertThat(repository.findByDistributionIdAndHouseholdHouseholdId(distribution.id!!, ticket.household!!.householdId)?.id).isEqualTo(ticket.id)
        assertThat(repository.findByDistributionIdAndTicketNumber(distribution.id!!, 999)).isNull()
    }

    @Test
    fun `the queue's next ticket is the lowest open one, its previous the highest processed one`() {
        assertThat(repository.findFirstByDistributionIdAndProcessedFalseOrderByTicketNumberAsc(distribution.id!!)?.ticketNumber).isEqualTo(3)
        assertThat(repository.findFirstByDistributionIdAndProcessedTrueOrderByTicketNumberDesc(distribution.id!!)?.ticketNumber).isEqualTo(2)
    }

    @Test
    fun `counts processed tickets and sees whether any ticket is open`() {
        assertThat(repository.countByDistributionIdAndProcessedTrue(distribution.id!!)).isEqualTo(2)
        assertThat(repository.existsByDistributionIdAndProcessedFalse(distribution.id!!)).isTrue()

        tickets.forEach { it.processed = true }
        testEntityManager.flush()

        assertThat(repository.existsByDistributionIdAndProcessedFalse(distribution.id!!)).isFalse()
    }

    @Test
    fun `counts additional persons without main persons and without the ones excluded from their household`() {
        addPerson(tickets[0].household!!, excludeFromHousehold = false)
        addPerson(tickets[0].household!!, excludeFromHousehold = true)
        addPerson(tickets[1].household!!, excludeFromHousehold = false)
        testEntityManager.flush()
        val expected = countAdditionalPersonsThroughTheEntities()

        assertThat(repository.countAdditionalPersons(distribution.id!!)).isEqualTo(expected)
    }

    @Test
    fun `a check-in reads the rows it checks, not the day's list`() {
        val newHousehold = tickets[5].household!!.householdId

        val loaded = ticketsLoadedBy { distributionService.assignHouseholdToDistribution(newHousehold, 100) }

        assertThat(loaded).isLessThanOrEqualTo(1)
    }

    @Test
    fun `the ticket screen reads the current ticket and counts, not the day's list`() {
        val loaded = ticketsLoadedBy {
            val ticket = distributionService.getCurrentTicketScreenTicket()
            assertThat(ticket.ticketNumber).isEqualTo(3)
            assertThat(ticket.processedTicketsCount).isEqualTo(2)
            assertThat(ticket.totalTicketsCount).isEqualTo(TICKETS_OF_THE_DAY)
        }

        assertThat(loaded).isLessThanOrEqualTo(1)
    }

    @Test
    fun `the dashboard counts tickets and persons without loading them`() {
        val loaded = ticketsLoadedBy {
            val data = dashboardService.getData()
            assertThat(data.tickets!!.countProcessedTickets).isEqualTo(2)
            assertThat(data.tickets.countTotalTickets).isEqualTo(TICKETS_OF_THE_DAY)
        }

        assertThat(loaded).isZero()
    }

    private fun ticketsLoadedBy(block: () -> Unit): Long {
        testEntityManager.clear()
        statistics.isStatisticsEnabled = true
        statistics.clear()
        block()
        testEntityManager.flush()
        return statistics.getEntityStatistics(DistributionHouseholdEntity::class.java.name).loadCount
    }

    @Test
    fun `a goodwill package is stored without a household and counts its further persons`() {
        distributionService.assignGoodwillTicket(ticketNumber = 50, personCount = 3, infantCount = 1)
        distributionService.assignGoodwillTicket(ticketNumber = 51, personCount = 1, infantCount = 0)
        testEntityManager.flush()
        testEntityManager.clear()

        val stored = repository.findByDistributionIdAndTicketNumber(distribution.id!!, 50)!!
        assertThat(stored.household).isNull()
        assertThat(stored.goodwill).isTrue()
        assertThat(stored.goodwillPersonCount).isEqualTo(3)
        assertThat(stored.goodwillInfantCount).isEqualTo(1)
        assertThat(repository.countGoodwillAdditionalPersons(distribution.id!!)).isEqualTo(2)
        assertThat(repository.countAdditionalPersons(distribution.id!!)).isEqualTo(countAdditionalPersonsThroughTheEntities())
    }

    @Test
    fun `the database refuses a goodwill package that belongs to a household`() {
        val household = tickets[0].household!!

        assertThatThrownBy {
            testEntityManager.persist(
                DistributionHouseholdEntity(
                    distribution = distribution,
                    household = household,
                    ticketNumber = 60,
                    goodwill = true,
                    goodwillPersonCount = 1,
                    goodwillInfantCount = 0,
                ),
            )
            testEntityManager.flush()
        }.hasStackTraceContaining("ck_distributions_households_goodwill")
    }

    @Test
    fun `the database refuses a ticket with neither a household nor a goodwill package`() {
        assertThatThrownBy {
            testEntityManager.persist(DistributionHouseholdEntity(distribution = distribution, household = null, ticketNumber = 61))
            testEntityManager.flush()
        }.hasStackTraceContaining("ck_distributions_households_goodwill")
    }

    private fun addPerson(household: HouseholdEntity, excludeFromHousehold: Boolean) {
        val person = PersonEntity(household = household, country = country, isMainPerson = false)
        person.lastname = "Additional"
        person.firstname = "Person"
        person.excludeFromHousehold = excludeFromHousehold
        household.persons.add(person)
        testEntityManager.persist(person)
    }

    private fun countAdditionalPersonsThroughTheEntities(): Long = tickets
        .flatMap { it.household!!.additionalPersons() }
        .count { !it.excludeFromHousehold }
        .toLong()
}
