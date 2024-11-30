package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionsRequest
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
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

    @InjectMockKs
    private lateinit var service: FoodCollectionService

    @Test
    fun `save without open distribution`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val request = FoodCollectionsRequest(
            routeId = routeId,
            carLicensePlate = "W-12345",
            driverId = driverId,
            coDriverId = coDriverId,
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
        val request = FoodCollectionsRequest(
            routeId = routeId,
            carLicensePlate = "W-12345",
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
    fun `save data again for same route`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val request = FoodCollectionsRequest(
            routeId = routeId,
            carLicensePlate = "W-12345",
            driverId = driverId,
            coDriverId = coDriverId,
            kmStart = 1000,
            kmEnd = 2000,
            items = emptyList()
        )
        val route = mockk<RouteEntity>()
        every { route.name } returns "route-name"
        every { routeRepository.findByIdOrNull(routeId) } returns route
        every { foodCollectionRepository.existsByDistributionAndRoute(any(), route) } returns true

        val exception = assertThrows<TafelValidationException> { service.save(request) }
        assertThat(exception.message).isEqualTo("Waren zur Route 'route-name' sind bereits erfasst!")
    }

    @Test
    fun save() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val request = FoodCollectionsRequest(
            routeId = routeId,
            carLicensePlate = "W-12345",
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

        service.save(request)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(testDistributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)
        assertThat(foodCollection.carLicensePlate).isEqualTo(request.carLicensePlate)
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
