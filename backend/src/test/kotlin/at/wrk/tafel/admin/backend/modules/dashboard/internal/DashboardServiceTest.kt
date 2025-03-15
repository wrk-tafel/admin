package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity3
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testRoute2
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
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
    fun `get tickets`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3,
            )
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.tickets!!.countProcessedTickets).isEqualTo(1)
        assertThat(data.tickets.countTotalTickets).isEqualTo(3)
    }

    @Test
    fun `get statistics`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = mutableListOf(
                    DistributionStatisticShelterEntity().apply {
                        id = testShelter1.id
                        name = testShelter1.name
                    },
                    DistributionStatisticShelterEntity().apply {
                        id = testShelter2.id
                        name = testShelter2.name
                    },
                )
            }
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val countRegisteredCustomers = 5
        every { distributionCustomerRepository.countAllByDistributionId(testDistributionEntity.id!!) } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.statistics!!.employeeCount).isEqualTo(100)
        assertThat(data.statistics.selectedShelterNames).hasSameElementsAs(
            listOf(testShelter1.name, testShelter2.name)
        )
    }

    @Test
    fun `get notes`() {
        val testNotes = "dummy-notes"
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            notes = testNotes
        }
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.notes).isEqualTo(testNotes)
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
    fun `get data without active distribution`() {
        every { distributionRepository.getCurrentDistribution() } returns null

        val data = service.getData()

        assertThat(data).isNotNull
        assertThat(data.registeredCustomers).isNull()
        assertThat(data.tickets).isNull()
        assertThat(data.statistics).isNull()
        assertThat(data.logistics).isNull()
        assertThat(data.notes).isNull()

        verify { distributionRepository.getCurrentDistribution() }
        verify(exactly = 0) { distributionCustomerRepository.countAllByDistributionId(any()) }
    }

}
