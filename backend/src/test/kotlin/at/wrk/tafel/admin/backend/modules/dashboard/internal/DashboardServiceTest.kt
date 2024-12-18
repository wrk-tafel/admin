package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class DashboardServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var distributionCustomerRepository: DistributionCustomerRepository

    @InjectMockKs
    private lateinit var service: DashboardService

    @Test
    fun `get registered customers`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val countRegisteredCustomers = 5
        every { distributionCustomerRepository.countAllByDistributionId(testDistributionEntity.id!!) } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.registeredCustomers).isEqualTo(countRegisteredCustomers)
    }

    @Test
    fun `get registered customers without active distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val data = service.getData()

        assertThat(data.registeredCustomers).isNull()

        verify { distributionRepository.getCurrentDistribution() }
        verify(exactly = 0) { distributionCustomerRepository.countAllByDistributionId(any()) }
    }

    @Test
    fun `get statistics`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            employeeCount = 100
            personsInShelterCount = 200
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val countRegisteredCustomers = 5
        every { distributionCustomerRepository.countAllByDistributionId(testDistributionEntity.id!!) } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.statistics!!.employeeCount).isEqualTo(100)
        assertThat(data.statistics.personsInShelterCount).isEqualTo(200)
    }

    @Test
    fun `get statistics without active distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val data = service.getData()

        assertThat(data.statistics).isNull()

        verify { distributionRepository.getCurrentDistribution() }
        verify(exactly = 0) { distributionCustomerRepository.countAllByDistributionId(any()) }
    }

}
