package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity4
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class MissingCostContributionPostProcessorTest {

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

    @InjectMockKs
    private lateinit var postProcessor: MissingCostContributionPostProcessor

    @Test
    fun `processed missing cost contributions`() {
        val mockStaticValue = mockk<StaticValueEntity>().apply {
            every { amount } returns BigDecimal(5)
        }
        every {
            staticValueRepository.findSingleValueOfType(StaticValueType.COST_CONTRIBUTION, any())
        } returns mockStaticValue

        val distribution = mockk<DistributionEntity>()
        val testDistributionCustomerEntities = listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2,
            testDistributionCustomerEntity3,
            testDistributionCustomerEntity4,
        )
        every { distribution.customers } returns testDistributionCustomerEntities
        every { customerRepository.findByIdOrNull(1L) } returns testDistributionCustomerEntity1.customer
        every { customerRepository.findByIdOrNull(2L) } returns testDistributionCustomerEntity2.customer
        every { customerRepository.findByIdOrNull(3L) } returns testDistributionCustomerEntity3.customer

        every { customerRepository.save(any()) } returns mockk()

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        postProcessor.process(distribution, distributionStatistic)

        val capturedCustomers = mutableListOf<CustomerEntity>()
        verify {
            customerRepository.save(capture(capturedCustomers))
        }

        val customer1 = capturedCustomers.first()
        assertThat(customer1.pendingCostContribution).isEqualTo(BigDecimal("17"))
        val customer2 = capturedCustomers[1]
        assertThat(customer2.pendingCostContribution).isEqualTo(BigDecimal("5"))

        verify(exactly = 0) {
            customerRepository.save(testDistributionCustomerEntity3.customer!!)
            customerRepository.save(testDistributionCustomerEntity4.customer!!)
        }
    }

    @Test
    fun `cost contributions static value missing`() {
        every { staticValueRepository.findSingleValueOfType(StaticValueType.COST_CONTRIBUTION, any()) } returns null

        val distribution = mockk<DistributionEntity>()
        val distributionStatistic = mockk<DistributionStatisticEntity>()

        val exception = assertThrows<TafelValidationException> { postProcessor.process(distribution, distributionStatistic) }
        assertThat(exception.message).isEqualTo("No cost contribution value found. Skipping missing cost contribution post processing.")
    }

}
