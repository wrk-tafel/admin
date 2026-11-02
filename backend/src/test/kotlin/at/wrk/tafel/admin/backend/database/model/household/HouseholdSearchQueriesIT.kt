package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.search.SearchTermNormalizer
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.orderBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.searchTextMatches
import jakarta.persistence.EntityManagerFactory
import org.assertj.core.api.Assertions.assertThat
import org.hibernate.SessionFactory
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.data.domain.PageRequest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional

/**
 * What a household search costs the database: one statement for the page and its total, a bounded
 * number for the associations of that page, and a similarity filter the trigram index can serve.
 */
@Transactional
class HouseholdSearchQueriesIT : TafelBaseIntegrationTest() {

    companion object {
        private const val HOUSEHOLDS = 7
    }

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var entityManagerFactory: EntityManagerFactory

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var searchTermNormalizer: SearchTermNormalizer

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    private lateinit var tafelAdminProperties: TafelAdminProperties

    private lateinit var name: String
    private var configuredThreshold = 0f

    private val statistics get() = entityManagerFactory.unwrap(SessionFactory::class.java).statistics

    @BeforeEach
    fun beforeEach() {
        configuredThreshold = tafelAdminProperties.search.similarityThreshold
        name = "findme${generateRandomLong()}"

        val user = testEntityManager.persist(createUser())
        val country = testEntityManager.persist(createCountry())
        repeat(HOUSEHOLDS) {
            val household = createHousehold(user, country)
            testEntityManager.persist(household)
            val mainPerson = household.persons.first { it.isMainPerson }
            mainPerson.lastname = name
            household.mainPerson = mainPerson
        }
        testEntityManager.flush()
    }

    @AfterEach
    fun afterEach() {
        tafelAdminProperties.search.similarityThreshold = configuredThreshold
        statistics.isStatisticsEnabled = false
    }

    @Test
    fun `a page and its total take one statement`() {
        val spec = searchFor(name)

        val statements = statementsOf {
            val page = householdRepository.findPageWithTotal(spec, PageRequest.of(0, 3))

            assertThat(page.content).hasSize(3)
            assertThat(page.totalElements).isEqualTo(HOUSEHOLDS.toLong())
            assertThat(page.totalPages).isEqualTo(3)
        }

        // the page, plus at most one batched select per association of its entities
        assertThat(statements).isLessThanOrEqualTo(5)
    }

    @Test
    fun `the last page knows the total as well`() {
        val page = householdRepository.findPageWithTotal(searchFor(name), PageRequest.of(2, 3))

        assertThat(page.content).hasSize(1)
        assertThat(page.totalElements).isEqualTo(HOUSEHOLDS.toLong())
    }

    @Test
    fun `a page past the last result still reports the total`() {
        val page = householdRepository.findPageWithTotal(searchFor(name), PageRequest.of(5, 3))

        assertThat(page.content).isEmpty()
        assertThat(page.totalElements).isEqualTo(HOUSEHOLDS.toLong())
    }

    @Test
    fun `no match on the first page has a total of zero`() {
        val page = householdRepository.findPageWithTotal(searchFor("zzzzqqqq${generateRandomLong()}"), PageRequest.of(0, 3))

        assertThat(page.content).isEmpty()
        assertThat(page.totalElements).isZero()
    }

    @Test
    fun `the page has the order the specification asks for`() {
        val page = householdRepository.findPageWithTotal(searchFor(name), PageRequest.of(0, HOUSEHOLDS))
        val all = householdRepository.findAll(searchFor(name))

        assertThat(page.content.map { it.id }).containsExactlyElementsOf(all.map { it.id })
    }

    @Test
    fun `reading the persons of a page takes the same statements whatever the page's size`() {
        val small = personStatementsOf(pageSize = 2)
        val large = personStatementsOf(pageSize = HOUSEHOLDS)

        assertThat(large).isEqualTo(small)
    }

    @Test
    fun `the configured threshold decides what counts as similar`() {
        val typo = name.replaceFirst("findme", "findmr")

        tafelAdminProperties.search.similarityThreshold = 0.3f
        assertThat(householdRepository.findAll(searchFor(typo))).hasSize(HOUSEHOLDS)

        tafelAdminProperties.search.similarityThreshold = 0.99f
        assertThat(householdRepository.findAll(searchFor(typo))).isEmpty()
    }

    @Test
    fun `the trigram index can serve both match modes`() {
        jdbcTemplate.execute("set local enable_seqscan = off")

        val plan = jdbcTemplate.queryForList(
            "explain select id from households where search_text like '%mustermann%' or 'mustermann' <<% search_text",
            String::class.java,
        ).joinToString("\n")

        assertThat(plan).contains("households_search_text_idx").doesNotContain("Seq Scan")
    }

    private fun searchFor(input: String) = orderBySearchRelevance(
        input,
        searchTextMatches(searchTermNormalizer.normalize(input))!!,
    )

    private fun statementsOf(block: () -> Unit): Long {
        testEntityManager.clear()
        statistics.isStatisticsEnabled = true
        statistics.clear()
        block()
        return statistics.prepareStatementCount
    }

    private fun personStatementsOf(pageSize: Int): Long {
        val spec = searchFor(name)
        return statementsOf {
            householdRepository.findPageWithTotal(spec, PageRequest.of(0, pageSize)).content.forEach { it.persons.size }
        }
    }
}
