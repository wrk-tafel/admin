package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
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

    @Test
    fun `searchInputMatches returns null spec when the search input is null`() {
        assertThat(EmployeeEntity.Specs.searchInputMatches(null)).isNull()
    }

    @Test
    fun `searchInputMatches matches personnel number, firstname and lastname, case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val byPersonnelNumber = persist(personnelNumber = tag, firstname = "a", lastname = "a")
        val byFirstname = persist(personnelNumber = "p${generateRandomLong()}", firstname = "prefix-$tag-suffix", lastname = "a")
        val byLastname = persist(personnelNumber = "p${generateRandomLong()}", firstname = "a", lastname = "prefix-$tag-suffix")
        val notMatching = persist(personnelNumber = "p${generateRandomLong()}", firstname = "a", lastname = "a")
        testEntityManager.flush()

        val result = employeeRepository.findAll(EmployeeEntity.Specs.searchInputMatches(tag.uppercase())!!)

        assertThat(result.map { it.id })
            .contains(byPersonnelNumber.id, byFirstname.id, byLastname.id)
            .doesNotContain(notMatching.id)
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

    private fun orderBySpec(tag: Long): Specification<EmployeeEntity> = EmployeeEntity.Specs.searchInputMatches("$tag")!!

    private fun persist(personnelNumber: String, firstname: String, lastname: String): EmployeeEntity {
        val entity = EmployeeEntity(personnelNumber = personnelNumber, firstname = firstname, lastname = lastname)
        testEntityManager.persist(entity)
        return entity
    }
}
