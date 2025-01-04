package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testRoute2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
internal class DashboardServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var distributionCustomerRepository: DistributionCustomerRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

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

    @Test
    fun `get logistics`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            foodCollections = listOf(
                testFoodCollectionRoute1Entity
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        every { routeRepository.findAll() } returns listOf(
            testRoute1,
            testRoute2
        )

        val data = service.getData()

        assertThat(data.logistics!!.foodCollectionsRecordedCount).isEqualTo(1)
        assertThat(data.logistics.foodCollectionsTotalCount).isEqualTo(2)
        assertThat(data.logistics.foodAmountTotal).isEqualTo(BigDecimal(100))
    }

    @Test
    fun `get logistics without active distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val data = service.getData()

        assertThat(data.logistics).isNull()

        verify { distributionRepository.getCurrentDistribution() }
        verify(exactly = 0) { distributionCustomerRepository.countAllByDistributionId(any()) }
    }

}
