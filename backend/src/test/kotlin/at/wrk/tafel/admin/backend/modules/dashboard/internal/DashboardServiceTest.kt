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
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
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
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DashboardServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var routeStopCompletionRepository: RouteStopCompletionRepository

    @InjectMockKs
    private lateinit var service: DashboardService

    @Test
    fun `get registered customers`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
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
    fun `get registered persons counts main persons plus not-excluded additional persons`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
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

        // 3 main persons + household 1's one additional person that is not excluded from the household
        assertThat(data.registeredPersons).isEqualTo(4)
    }

    @Test
    fun `get tickets`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
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
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = null
        }
        val testStatistic = DistributionStatisticEntity(distribution = testDistributionEntity).apply {
            employeeCount = 100
        }
        testStatistic.shelters = mutableListOf(
            DistributionStatisticShelterEntity(
                statistic = testStatistic,
                name = testShelter1.name,
                addressStreet = testShelter1.addressStreet,
                addressHouseNumber = testShelter1.addressHouseNumber,
                addressPostalCode = testShelter1.addressPostalCode,
                addressCity = testShelter1.addressCity,
                personsCount = testShelter1.personsCount,
                sortOrder = testShelter1.sortOrder,
            ).apply { id = testShelter1.id },
            DistributionStatisticShelterEntity(
                statistic = testStatistic,
                name = testShelter2.name,
                addressStreet = testShelter2.addressStreet,
                addressHouseNumber = testShelter2.addressHouseNumber,
                addressPostalCode = testShelter2.addressPostalCode,
                addressCity = testShelter2.addressCity,
                personsCount = testShelter2.personsCount,
                sortOrder = testShelter2.sortOrder,
            ).apply { id = testShelter2.id },
        )
        testDistributionEntity.statistic = testStatistic
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
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = null
        }
        val testStatistic = DistributionStatisticEntity(distribution = testDistributionEntity).apply {
            employeeCount = 100
        }
        testStatistic.shelters = mutableListOf(
            DistributionStatisticShelterEntity(
                statistic = testStatistic,
                name = "Shelter Z",
                addressStreet = "Street",
                addressHouseNumber = "1",
                addressPostalCode = 1234,
                addressCity = "City",
                personsCount = 1,
                sortOrder = 1,
            ),
            DistributionStatisticShelterEntity(
                statistic = testStatistic,
                name = "Shelter A",
                addressStreet = "Street",
                addressHouseNumber = "2",
                addressPostalCode = 1234,
                addressCity = "City",
                personsCount = 1,
                sortOrder = 2,
            ),
        )
        testDistributionEntity.statistic = testStatistic
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        val data = service.getData()

        assertThat(data.statistics!!.selectedShelterNames).containsExactly("Shelter Z", "Shelter A")
    }

    @Test
    fun `get notes`() {
        val testNotes = "dummy-notes"
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
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
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity)

        // fully recorded, same as testFoodCollectionRoute1Entity but for a different/later route -
        // verifies recordedRouteNames covers more than one route and sorts by route number
        val doneRoute4 = FoodCollectionEntity(distribution = testDistributionEntity, route = testRoute4).apply {
            car = testCar1
            driver = testEmployee1
            coDriver = testEmployee2
            kmStart = 10
            kmEnd = 20
            items = listOf(
                FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop1, amount = 0),
            )
        }

        testDistributionEntity.apply {
            id = 123
            endedAt = null
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                // real "getOrCreateFoodCollectionEntity" scenario: base data saved, items field
                // never touched yet and still at its entity default of null (not an empty list)
                partiallyRecordedFoodCollection(testDistributionEntity, items = null),
                partiallyRecordedFoodCollection(testDistributionEntity, items = emptyList()),
                partiallyRecordedFoodCollection(testDistributionEntity, driver = null),
                partiallyRecordedFoodCollection(testDistributionEntity, coDriver = null),
                partiallyRecordedFoodCollection(testDistributionEntity, kmStart = null),
                partiallyRecordedFoodCollection(testDistributionEntity, kmEnd = null),
                doneRoute4,
            )
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity

        every { routeRepository.findByEnabledIsTrue() } returns listOf(
            testRoute1,
            testRoute2,
            testRoute3,
            testRoute4,
        )

        val data = service.getData()

        assertThat(data.logistics!!.foodCollectionsRecordedCount).isEqualTo(2)
        assertThat(data.logistics.foodCollectionsTotalCount).isEqualTo(4)
        assertThat(data.logistics.recordedRouteNames).containsExactly("Route 1", "Route 4")
        assertThat(data.logistics.allRouteNames).containsExactly("Route 1", "Route 2", "Route 3", "Route 4")
        assertThat(data.logistics.foodAmountTotal).isEqualTo(BigDecimal(140))
        // nobody has ticked a stop off today, so the panel has nothing to say yet
        assertThat(data.logistics.routeProgress).isEmpty()
    }

    /**
     * The route guidance screen is optional, and a deployment whose drivers don't use it would
     * otherwise carry a panel of permanent zeroes on a dashboard that has to fit on one screen.
     */
    @Test
    fun `route progress stays empty until a stop has been ticked off today`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { routeRepository.findByEnabledIsTrue() } returns listOf(testRoute1)
        every {
            routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(any(), LocalDate.now())
        } returns emptyList()

        val data = service.getData()

        assertThat(data.logistics!!.routeProgress).isEmpty()
    }

    @Test
    fun `route progress counts the stops ticked off today`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { routeRepository.findByEnabledIsTrue() } returns listOf(testRoute1, testRoute2)
        every {
            routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(any(), LocalDate.now())
        } returns listOf(
            RouteStopCompletionEntity(routeStop = testRoute1.stops.first { it.id == 11L }, completionDate = LocalDate.now()),
            RouteStopCompletionEntity(routeStop = testRoute1.stops.first { it.id == 22L }, completionDate = LocalDate.now()),
        )

        val data = service.getData()

        val routeProgress = data.logistics!!.routeProgress.single()
        assertThat(routeProgress.routeId).isEqualTo(1)
        assertThat(routeProgress.routeNumber).isEqualTo(1.0)
        assertThat(routeProgress.routeName).isEqualTo("Route 1")
        assertThat(routeProgress.completedStops).isEqualTo(2)
        assertThat(routeProgress.totalStops).isEqualTo(3)
    }

    @Test
    fun `route progress asks for nothing when no route has stops`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns testDistributionEntity
        every { routeRepository.findByEnabledIsTrue() } returns listOf(testRoute2, testRoute3)

        val data = service.getData()

        assertThat(data.logistics!!.routeProgress).isEmpty()
        verify(exactly = 0) { routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(any(), any()) }
    }

    // Base data is otherwise complete (car/driver/co-driver/mileage) and one food item is present -
    // each call below nulls out exactly one of those fields, to exercise every individual
    // "not fully recorded" branch in DashboardService.isFullyRecorded() on its own.
    private fun partiallyRecordedFoodCollection(
        distribution: DistributionEntity,
        driver: EmployeeEntity? = testEmployee1,
        coDriver: EmployeeEntity? = testEmployee2,
        kmStart: Int? = 100,
        kmEnd: Int? = 200,
        items: List<FoodCollectionItemEntity>? = listOf(
            FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop1, amount = 0),
        ),
    ): FoodCollectionEntity = FoodCollectionEntity(distribution = distribution, route = testRoute2).apply {
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
        assertThat(data.registeredPersons).isNull()
        assertThat(data.tickets).isNull()
        assertThat(data.statistics).isNull()
        assertThat(data.logistics).isNull()
        assertThat(data.notes).isNull()

        verify { distributionRepository.findFirstByOrderByIdDesc() }
        verify(exactly = 0) { distributionHouseholdRepository.countAllByDistributionId(any()) }
    }
}
