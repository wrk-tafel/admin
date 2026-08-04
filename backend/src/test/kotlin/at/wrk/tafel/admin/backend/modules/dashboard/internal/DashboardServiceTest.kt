package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testRoute2
import at.wrk.tafel.admin.backend.modules.logistics.testRoute3
import at.wrk.tafel.admin.backend.modules.logistics.testRoute4
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
import at.wrk.tafel.admin.backend.modules.logistics.testShop1
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
        // fully recorded, same as testFoodCollectionRoute1Entity but for a different/later route -
        // verifies recordedRouteNames covers more than one route and sorts by route number
        val doneRoute4 = FoodCollectionEntity().apply {
            route = testRoute4
            car = testCar1
            driver = testEmployee1
            coDriver = testEmployee2
            kmStart = 10
            kmEnd = 20
            items = listOf(
                FoodCollectionItemEntity().apply {
                    category = testFoodCategory1
                    shop = testShop1
                    amount = 0
                },
            )
        }
        // fully recorded but without a route reference (defensive case, route is nullable on the
        // entity) - must fall back to the default sort key instead of throwing, and must be
        // dropped from recordedRouteNames (no name to show) while still counting towards the total
        val doneWithoutRoute = FoodCollectionEntity().apply {
            route = null
            car = testCar1
            driver = testEmployee1
            coDriver = testEmployee2
            kmStart = 10
            kmEnd = 20
            items = listOf(
                FoodCollectionItemEntity().apply {
                    category = testFoodCategory1
                    shop = testShop1
                    amount = 0
                },
            )
        }

        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            endedAt = null
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                // real "getOrCreateFoodCollectionEntity" scenario: base data saved, items field
                // never touched yet and still at its entity default of null (not an empty list)
                partiallyRecordedFoodCollection(items = null),
                partiallyRecordedFoodCollection(items = emptyList()),
                partiallyRecordedFoodCollection(driver = null),
                partiallyRecordedFoodCollection(coDriver = null),
                partiallyRecordedFoodCollection(kmStart = null),
                partiallyRecordedFoodCollection(kmEnd = null),
                doneRoute4,
                doneWithoutRoute,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        every { routeRepository.findAll() } returns listOf(
            testRoute1,
            testRoute2,
            testRoute3,
            testRoute4,
        )

        val data = service.getData()

        assertThat(data.logistics!!.foodCollectionsRecordedCount).isEqualTo(3)
        assertThat(data.logistics.foodCollectionsTotalCount).isEqualTo(4)
        assertThat(data.logistics.recordedRouteNames).containsExactly("Route 1", "Route 4")
        assertThat(data.logistics.foodAmountTotal).isEqualTo(BigDecimal(100))
    }

    // Base data is otherwise complete (car/driver/co-driver/mileage) and one food item is present -
    // each call below nulls out exactly one of those fields, to exercise every individual
    // "not fully recorded" branch in DashboardService.isFullyRecorded() on its own.
    private fun partiallyRecordedFoodCollection(
        driver: EmployeeEntity? = testEmployee1,
        coDriver: EmployeeEntity? = testEmployee2,
        kmStart: Int? = 100,
        kmEnd: Int? = 200,
        items: List<FoodCollectionItemEntity>? = listOf(
            FoodCollectionItemEntity().apply {
                category = testFoodCategory1
                shop = testShop1
                amount = 0
            },
        ),
    ): FoodCollectionEntity = FoodCollectionEntity().apply {
        route = testRoute2
        car = testCar1
        this.driver = driver
        this.coDriver = coDriver
        this.kmStart = kmStart
        this.kmEnd = kmEnd
        this.items = items
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
