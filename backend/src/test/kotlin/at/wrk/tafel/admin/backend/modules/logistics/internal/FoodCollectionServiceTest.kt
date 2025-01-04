package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionSaveRequest
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testShop1
import at.wrk.tafel.admin.backend.modules.logistics.testShop2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class FoodCollectionServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var foodCollectionRepository: FoodCollectionRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var shopRepository: ShopRepository

    @RelaxedMockK
    private lateinit var foodCategoryRepository: FoodCategoryRepository

    @RelaxedMockK
    private lateinit var carRepository: CarRepository

    @InjectMockKs
    private lateinit var service: FoodCollectionService

    @Test
    fun `get food collection data`() {
        val routeId = testFoodCollectionRoute1Entity.route!!.id!!
        every { employeeRepository.findByIdOrNull(testEmployee1.id) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(testEmployee2.id) } returns testEmployee2

        val distributionMock = mockk<DistributionEntity>()
        every { distributionMock.foodCollections } returns listOf(testFoodCollectionRoute1Entity)
        every { distributionRepository.getCurrentDistribution() } returns distributionMock

        val data = service.getFoodCollection(routeId)!!

        assertThat(data.carId).isEqualTo(testFoodCollectionRoute1Entity.car!!.id)
        assertThat(data.driver).isEqualTo(
            Employee(
                id = testFoodCollectionRoute1Entity.driver!!.id!!,
                personnelNumber = testEmployee1.personnelNumber!!,
                firstname = testEmployee1.firstname!!,
                lastname = testEmployee1.lastname!!
            )
        )
        assertThat(data.coDriver).isEqualTo(
            Employee(
                id = testFoodCollectionRoute1Entity.coDriver!!.id!!,
                personnelNumber = testEmployee2.personnelNumber!!,
                firstname = testEmployee2.firstname!!,
                lastname = testEmployee2.lastname!!
            )
        )
        assertThat(data.kmStart).isEqualTo(testFoodCollectionRoute1Entity.kmStart)
        assertThat(data.kmEnd).isEqualTo(testFoodCollectionRoute1Entity.kmEnd)
        assertThat(data.items).hasSize(testFoodCollectionRoute1Entity.items!!.size)

        assertThat(data.items[1]).isEqualTo(
            FoodCollectionItem(
                categoryId = 1,
                shopId = 2,
                amount = 2
            )
        )
        assertThat(data.items[2]).isEqualTo(
            FoodCollectionItem(
                categoryId = 2,
                shopId = 1,
                amount = 0
            )
        )
    }

    @Test
    fun `get food collection data without open distribution`() {
        val routeId = testFoodCollectionRoute1Entity.route!!.id!!
        every { distributionRepository.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.getFoodCollection(routeId) }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `save without open distribution`() {
        val request = FoodCollectionSaveRequest(
            routeId = 123L,
            carId = testCar1.id!!,
            driverId = 1L,
            coDriverId = 2L,
            kmStart = 1000,
            kmEnd = 2000,
            items = emptyList()
        )
        every { distributionRepository.getCurrentDistribution() } returns null

        val exception = assertThrows<TafelValidationException> { service.save(request) }
        assertThat(exception.message).isEqualTo("Ausgabe nicht gestartet!")
    }

    @Test
    fun `save with invalid route`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val request = FoodCollectionSaveRequest(
            routeId = routeId,
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
            kmStart = 1000,
            kmEnd = 2000,
            items = emptyList()
        )
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<TafelValidationException> { service.save(request) }
        assertThat(exception.message).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun save() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val request = FoodCollectionSaveRequest(
            routeId = routeId,
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
            kmStart = 1000,
            kmEnd = 2000,
            items = listOf(
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = testShop1.id!!,
                    amount = 1
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory2.id!!,
                    shopId = testShop1.id!!,
                    amount = 2
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = testShop2.id!!,
                    amount = 3
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory2.id!!,
                    shopId = testShop2.id!!,
                    amount = 4
                )
            )
        )
        every { distributionRepository.getCurrentDistribution() } returns testDistributionEntity
        every { routeRepository.findByIdOrNull(request.routeId) } returns testRoute1
        every { employeeRepository.findByIdOrNull(request.driverId) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(request.coDriverId) } returns testEmployee2
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id) } returns testShop2
        every { carRepository.findByIdOrNull(testCar1.id) } returns testCar1

        service.save(request)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(testDistributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)
        assertThat(foodCollection.car!!.id).isEqualTo(request.carId)
        assertThat(foodCollection.driver!!.id).isEqualTo(request.driverId)
        assertThat(foodCollection.coDriver!!.id).isEqualTo(request.coDriverId)
        assertThat(foodCollection.kmStart).isEqualTo(request.kmStart)
        assertThat(foodCollection.kmEnd).isEqualTo(request.kmEnd)

        assertThat(foodCollection.items).hasSize(request.items.size)
        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(request.items[0].categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(request.items[0].shopId)
        assertThat(foodCollection.items!![0].amount).isEqualTo(request.items[0].amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(request.items[1].categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(request.items[1].shopId)
        assertThat(foodCollection.items!![1].amount).isEqualTo(request.items[1].amount)

        assertThat(foodCollection.items!![2].category!!.id).isEqualTo(request.items[2].categoryId)
        assertThat(foodCollection.items!![2].shop!!.id).isEqualTo(request.items[2].shopId)
        assertThat(foodCollection.items!![2].amount).isEqualTo(request.items[2].amount)

        assertThat(foodCollection.items!![3].category!!.id).isEqualTo(request.items[3].categoryId)
        assertThat(foodCollection.items!![3].shop!!.id).isEqualTo(request.items[3].shopId)
        assertThat(foodCollection.items!![3].amount).isEqualTo(request.items[3].amount)
    }

}
