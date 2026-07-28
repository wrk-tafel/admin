package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
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
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @InjectMockKs
    private lateinit var service: DashboardService

    @Test
    fun `get registered customers`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val countRegisteredCustomers = 5
        every { distributionHouseholdRepository.countAllByDistributionId(testDistributionEntity.id!!) } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.registeredCustomers).isEqualTo(countRegisteredCustomers)
    }

    @Test
    fun `get tickets`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
                testDistributionHouseholdEntity3,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.tickets!!.countProcessedTickets).isEqualTo(1)
        assertThat(data.tickets.countTotalTickets).isEqualTo(3)
    }

    @Test
    fun `get statistics`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
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
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val countRegisteredCustomers = 5
        every { distributionHouseholdRepository.countAllByDistributionId(testDistributionEntity.id!!) } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.statistics!!.employeeCount).isEqualTo(100)
        assertThat(data.statistics.selectedShelterNames).hasSameElementsAs(
            listOf(testShelter1.name, testShelter2.name),
        )
    }

    @Test
    fun `get statistics sorts shelters by their frozen sortOrder, not name`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = mutableListOf(
                    DistributionStatisticShelterEntity().apply {
                        name = "Shelter Z"
                        sortOrder = 1
                    },
                    DistributionStatisticShelterEntity().apply {
                        name = "Shelter A"
                        sortOrder = 2
                    },
                )
            }
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.statistics!!.selectedShelterNames).containsExactly("Shelter Z", "Shelter A")
    }

    @Test
    fun `get notes`() {
        val testNotes = "dummy-notes"
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            notes = testNotes
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.notes).isEqualTo(testNotes)
    }

    @Test
    fun `get logistics`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        every { routeRepository.findAll() } returns listOf(
            testRoute1,
            testRoute2,
        )

        val data = service.getData()

        assertThat(data.logistics!!.foodCollectionsRecordedCount).isEqualTo(1)
        assertThat(data.logistics.foodCollectionsTotalCount).isEqualTo(2)
        assertThat(data.logistics.foodAmountTotal).isEqualTo(BigDecimal(100))
    }

    @Test
    fun `get data without active distribution`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        val data = service.getData()

        assertThat(data).isNotNull
        assertThat(data.registeredCustomers).isNull()
        assertThat(data.tickets).isNull()
        assertThat(data.statistics).isNull()
        assertThat(data.logistics).isNull()
        assertThat(data.notes).isNull()

        verify { distributionRepository.findFirstByOrderByIdDesc() }
        verify(exactly = 0) { distributionHouseholdRepository.countAllByDistributionId(any()) }
    }
}
