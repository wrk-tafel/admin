package at.wrk.tafel.admin.backend.database.model.customer

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCustomer
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Transactional
class CustomerEntitySpecsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var customerRepository: CustomerRepository

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
    fun `firstnameContains returns null spec when firstname is null`() {
        assertThat(CustomerEntity.Specs.firstnameContains(null)).isNull()
    }

    @Test
    fun `firstnameContains matches case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistCustomer { firstname = "Prefix-$tag-Suffix" }
        val notMatching = persistCustomer { firstname = "unrelated-${generateRandomLong()}" }
        testEntityManager.flush()

        val result = customerRepository.findAll(CustomerEntity.Specs.firstnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `lastnameContains returns null spec when lastname is null`() {
        assertThat(CustomerEntity.Specs.lastnameContains(null)).isNull()
    }

    @Test
    fun `lastnameContains matches case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistCustomer { lastname = "Prefix-$tag-Suffix" }
        val notMatching = persistCustomer { lastname = "unrelated-${generateRandomLong()}" }
        testEntityManager.flush()

        val result = customerRepository.findAll(CustomerEntity.Specs.lastnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `postProcessingNecessary matches customer with missing required field`() {
        val tag = "Findme${generateRandomLong()}"
        val incomplete = persistCustomer {
            firstname = tag
            gender = null
        }
        val complete = persistCustomer { firstname = tag }
        testEntityManager.flush()

        val result = customerRepository.findAll(
            CustomerEntity.Specs.postProcessingNecessary().and(CustomerEntity.Specs.firstnameContains(tag)!!)
        )

        assertThat(result.map { it.id }).contains(incomplete.id).doesNotContain(complete.id)
    }

    @Test
    fun `postProcessingNecessary matches customer whose additional person is missing required field`() {
        val tag = "Findme${generateRandomLong()}"
        val withIncompleteAddPerson = persistCustomer { firstname = tag }
        withIncompleteAddPerson.additionalPersons = mutableListOf(
            CustomerAddPersonEntity().apply {
                customer = withIncompleteAddPerson
                firstname = "child-${generateRandomLong()}"
                lastname = "child-${generateRandomLong()}"
                country = testCountry
                excludeFromHousehold = false
                receivesFamilyBonus = false
                birthDate = null
                gender = null
            }
        )
        testEntityManager.persist(withIncompleteAddPerson.additionalPersons.first())

        val complete = persistCustomer { firstname = tag }
        testEntityManager.flush()

        val result = customerRepository.findAll(
            CustomerEntity.Specs.postProcessingNecessary().and(CustomerEntity.Specs.firstnameContains(tag)!!)
        )

        assertThat(result.map { it.id }).contains(withIncompleteAddPerson.id).doesNotContain(complete.id)
    }

    @Test
    fun `pendingCostContribution matches customers with a pending amount above zero`() {
        val tag = "Findme${generateRandomLong()}"
        val pending = persistCustomer {
            firstname = tag
            pendingCostContribution = BigDecimal("10")
        }
        val notPending = persistCustomer {
            firstname = tag
            pendingCostContribution = BigDecimal.ZERO
        }
        testEntityManager.flush()

        val result = customerRepository.findAll(
            CustomerEntity.Specs.pendingCostContribution().and(CustomerEntity.Specs.firstnameContains(tag)!!)
        )

        assertThat(result.map { it.id }).contains(pending.id).doesNotContain(notPending.id)
    }

    @Test
    fun `validCustomer matches only customers with a validUntil today or in the future`() {
        val tag = "Findme${generateRandomLong()}"
        val valid = persistCustomer {
            firstname = tag
            validUntil = LocalDate.now().plusDays(1)
        }
        val validToday = persistCustomer {
            firstname = tag
            validUntil = LocalDate.now()
        }
        val expired = persistCustomer {
            firstname = tag
            validUntil = LocalDate.now().minusDays(1)
        }
        testEntityManager.flush()

        val result = customerRepository.findAll(
            CustomerEntity.Specs.validCustomer().and(CustomerEntity.Specs.firstnameContains(tag)!!)
        )

        assertThat(result.map { it.id })
            .contains(valid.id, validToday.id)
            .doesNotContain(expired.id)
    }

    @Test
    fun `orderByUpdatedAtDesc sorts the most recently updated customer first`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistCustomer { firstname = tag }
        testEntityManager.flush()

        Thread.sleep(50)

        val second = persistCustomer { firstname = tag }
        testEntityManager.flush()

        val spec = CustomerEntity.Specs.orderByUpdatedAtDesc(CustomerEntity.Specs.firstnameContains(tag)!!)
        val result = customerRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(second.id, first.id)
    }

    private fun persistCustomer(customize: CustomerEntity.() -> Unit = {}): CustomerEntity {
        val customer = createCustomer(testUser.employee!!, testCountry)
        customer.customize()
        testEntityManager.persist(customer)
        return customer
    }

}
