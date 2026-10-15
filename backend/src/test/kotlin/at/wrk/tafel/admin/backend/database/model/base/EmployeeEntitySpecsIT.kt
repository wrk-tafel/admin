package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.common.search.SearchTermNormalizer
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.data.jpa.domain.Specification
import org.springframework.transaction.annotation.Transactional

@Transactional
class EmployeeEntitySpecsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var searchTermNormalizer: SearchTermNormalizer

    companion object {
        private const val SIMILARITY_THRESHOLD = 0.5f
    }

    @Test
    fun `searchTextMatches returns null spec when the search term is null`() {
        assertThat(EmployeeEntity.Specs.searchTextMatches(null, SIMILARITY_THRESHOLD)).isNull()
    }

    @Test
    fun `searchTextMatches matches personnel number, firstname and lastname, case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val byPersonnelNumber = persist(personnelNumber = tag, firstname = "a", lastname = "a")
        val byFirstname = persist(personnelNumber = "p${generateRandomLong()}", firstname = "prefix-$tag-suffix", lastname = "a")
        val byLastname = persist(personnelNumber = "p${generateRandomLong()}", firstname = "a", lastname = "prefix-$tag-suffix")
        val notMatching = persist(personnelNumber = "p${generateRandomLong()}", firstname = "a", lastname = "a")
        testEntityManager.flush()

        val result = employeeRepository.findAll(searchSpec(tag.uppercase()))

        assertThat(result.map { it.id })
            .contains(byPersonnelNumber.id, byFirstname.id, byLastname.id)
            .doesNotContain(notMatching.id)
    }

    @Test
    fun `searchTextMatches ignores accents and spans first and last name`() {
        val tag = generateRandomLong()
        val employee = persist(personnelNumber = "p$tag", firstname = "Ayşe", lastname = "Öztürk$tag")
        testEntityManager.flush()

        assertThat(employeeRepository.findAll(searchSpec("ayse ozturk$tag")).map { it.id }).containsExactly(employee.id)
    }

    @Test
    fun `searchTextMatches tolerates a typo, unless only verbatim matches are asked for`() {
        val tag = generateRandomLong()
        val employee = persist(personnelNumber = "p$tag", firstname = "Max", lastname = "Mustermann$tag")
        testEntityManager.flush()

        assertThat(employeeRepository.findAll(searchSpec("Mustermsnn$tag")).map { it.id }).containsExactly(employee.id)
        assertThat(employeeRepository.findAll(searchSpec("Mustermsnn$tag", verbatimOnly = true))).isEmpty()
        assertThat(employeeRepository.findAll(searchSpec("Mustermann$tag", verbatimOnly = true)).map { it.id })
            .containsExactly(employee.id)
    }

    @Test
    fun `orderById sorts the verbatim match before the merely similar one while searching`() {
        val tag = generateRandomLong()
        val fuzzyHit = persist(personnelNumber = "p1$tag", firstname = "a", lastname = "Findmr$tag")
        val verbatimHit = persist(personnelNumber = "p2$tag", firstname = "a", lastname = "Findme$tag")
        testEntityManager.flush()

        val searchTerm = searchTermNormalizer.normalize("Findme$tag")
        val spec = EmployeeEntity.Specs.orderById(searchSpec("Findme$tag"), searchTerm = searchTerm)
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(verbatimHit.id, fuzzyHit.id)
    }

    @Test
    fun `orderById sorts ascending by id by default`() {
        val tag = generateRandomLong()
        val first = persist(personnelNumber = "1$tag", firstname = "a", lastname = "a")
        val second = persist(personnelNumber = "2$tag", firstname = "a", lastname = "a")
        testEntityManager.flush()

        val spec = EmployeeEntity.Specs.orderById(orderBySpec(tag))
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(first.id, second.id)
    }

    @Test
    fun `orderById sorts by the requested column, overriding the id default`() {
        val tag = generateRandomLong()
        // Persisted second, so it would come after the other one under the id default.
        val alpha = persist(personnelNumber = "2$tag", firstname = "Alpha", lastname = "a")
        val bravo = persist(personnelNumber = "1$tag", firstname = "Bravo", lastname = "a")
        testEntityManager.flush()

        val spec = EmployeeEntity.Specs.orderById(orderBySpec(tag), sortBy = "firstname", sortDirection = "asc")
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(alpha.id, bravo.id)
    }

    @Test
    fun `orderById sorts descending when requested`() {
        val tag = generateRandomLong()
        val alpha = persist(personnelNumber = "1$tag", firstname = "Alpha", lastname = "a")
        val bravo = persist(personnelNumber = "2$tag", firstname = "Bravo", lastname = "a")
        testEntityManager.flush()

        val spec = EmployeeEntity.Specs.orderById(orderBySpec(tag), sortBy = "firstname", sortDirection = "desc")
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(bravo.id, alpha.id)
    }

    @Test
    fun `orderById sorts by lastname when requested`() {
        val tag = generateRandomLong()
        val alpha = persist(personnelNumber = "1$tag", firstname = "a", lastname = "Alpha")
        val bravo = persist(personnelNumber = "2$tag", firstname = "a", lastname = "Bravo")
        testEntityManager.flush()

        val spec = EmployeeEntity.Specs.orderById(orderBySpec(tag), sortBy = "lastname", sortDirection = "asc")
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(alpha.id, bravo.id)
    }

    @Test
    fun `orderById sorts by personnelNumber when requested`() {
        val tag = generateRandomLong()
        val lower = persist(personnelNumber = "1$tag", firstname = "a", lastname = "a")
        val higher = persist(personnelNumber = "2$tag", firstname = "a", lastname = "a")
        testEntityManager.flush()

        val spec = EmployeeEntity.Specs.orderById(orderBySpec(tag), sortBy = "personnelNumber", sortDirection = "asc")
        val result = employeeRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(lower.id, higher.id)
    }

    private fun orderBySpec(tag: Long): Specification<EmployeeEntity> = searchSpec("$tag", verbatimOnly = true)

    private fun searchSpec(searchInput: String, verbatimOnly: Boolean = false): Specification<EmployeeEntity> = EmployeeEntity.Specs.searchTextMatches(searchTermNormalizer.normalize(searchInput), SIMILARITY_THRESHOLD, verbatimOnly)!!

    private fun persist(personnelNumber: String, firstname: String, lastname: String): EmployeeEntity {
        val entity = EmployeeEntity(personnelNumber = personnelNumber, firstname = firstname, lastname = lastname)
        testEntityManager.persist(entity)
        return entity
    }
}
