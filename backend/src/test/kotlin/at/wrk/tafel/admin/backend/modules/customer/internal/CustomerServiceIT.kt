package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCustomer
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

class CustomerServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var customerService: CustomerService

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
    @Disabled // TODO re-enable when merge logic is enhanced
    @Transactional
    fun `merge customers`() {
        val distribution1 = createDistribution(testUser)
        testEntityManager.persist(distribution1)

        val distribution2 = createDistribution(testUser)
        testEntityManager.persist(distribution2)

        val targetCustomer = createCustomer(testUser.employee!!, testCountry)
        testEntityManager.persist(targetCustomer)
        val sourceCustomer1 = createCustomer(testUser.employee!!, testCountry)
        testEntityManager.persist(sourceCustomer1)
        val sourceCustomer2 = createCustomer(testUser.employee!!, testCountry)
        testEntityManager.persist(sourceCustomer2)
        val sourceCustomer3 = createCustomer(testUser.employee!!, testCountry)
        testEntityManager.persist(sourceCustomer3)

        createDistributionCustomerEntity(customer = targetCustomer, distribution = distribution1, ticketNumber = 1)
        createDistributionCustomerEntity(customer = sourceCustomer1, distribution = distribution1, ticketNumber = 2)

        createDistributionCustomerEntity(customer = sourceCustomer2, distribution = distribution2, ticketNumber = 1)
        createDistributionCustomerEntity(customer = sourceCustomer3, distribution = distribution2, ticketNumber = 2)

        testEntityManager.flush()
        testEntityManager.clear()

        customerService.mergeCustomers(
            targetCustomer.customerId!!,
            listOf(sourceCustomer1.customerId!!, sourceCustomer2.customerId!!, sourceCustomer3.customerId!!)
        )

        testEntityManager.flush()
        testEntityManager.clear()

        // targetCustomer still exists
        assertThat(testEntityManager.find(CustomerEntity::class.java, targetCustomer.id as Any)).isNotNull

        // sourceCustomers are deleted
        assertThat(testEntityManager.find(CustomerEntity::class.java, sourceCustomer1.id as Any)).isNull()
        assertThat(testEntityManager.find(CustomerEntity::class.java, sourceCustomer2.id as Any)).isNull()
        assertThat(testEntityManager.find(CustomerEntity::class.java, sourceCustomer3.id as Any)).isNull()
    }

    private fun createDistributionCustomerEntity(
        customer: CustomerEntity,
        distribution: DistributionEntity,
        ticketNumber: Int
    ): DistributionCustomerEntity {
        val distributionCustomerEntity = DistributionCustomerEntity()

        distributionCustomerEntity.customer = customer
        distributionCustomerEntity.distribution = distribution
        distributionCustomerEntity.ticketNumber = ticketNumber
        distributionCustomerEntity.processed = false

        testEntityManager.persist(distributionCustomerEntity)
        return distributionCustomerEntity
    }

}
