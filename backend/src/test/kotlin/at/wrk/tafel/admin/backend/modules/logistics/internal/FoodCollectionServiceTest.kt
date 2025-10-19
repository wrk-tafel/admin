package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import at.wrk.tafel.admin.backend.modules.logistics.*
import at.wrk.tafel.admin.backend.modules.logistics.model.*
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
import java.time.LocalDateTime

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
        every { employeeRepository.findByIdOrNull(testEmployee1.id!!) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(testEmployee2.id!!) } returns testEmployee2

        val distributionMock = mockk<DistributionEntity>()
        every { distributionMock.foodCollections } returns listOf(testFoodCollectionRoute1Entity)
        every { distributionMock.endedAt } returns null
        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionMock

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
    fun `save route data with invalid route`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val data = FoodCollectionSaveRouteData(
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
            kmStart = 1000,
            kmEnd = 2000,
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<TafelValidationException> { service.saveRouteData(routeId = routeId, data = data) }
        assertThat(exception.message).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `save route data`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val data = FoodCollectionSaveRouteData(
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
            kmStart = 1000,
            kmEnd = 2000,
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { employeeRepository.findByIdOrNull(data.driverId) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(data.coDriverId) } returns testEmployee2
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1

        service.saveRouteData(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(activeDistribution.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)
        assertThat(foodCollection.car!!.id).isEqualTo(data.carId)
        assertThat(foodCollection.driver!!.id).isEqualTo(data.driverId)
        assertThat(foodCollection.coDriver!!.id).isEqualTo(data.coDriverId)
        assertThat(foodCollection.kmStart).isEqualTo(data.kmStart)
        assertThat(foodCollection.kmEnd).isEqualTo(data.kmEnd)
    }

    @Test
    fun `save items with invalid route`() {
        val routeId = 123L
        val data = FoodCollectionItems(
            items = emptyList()
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<TafelValidationException> { service.saveItems(routeId = routeId, data = data) }
        assertThat(exception.message).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `save items`() {
        val routeId = 123L
        val data = FoodCollectionItems(
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
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2

        service.saveItems(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(activeDistribution.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(data.items.size)
        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(data.items[0].categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(data.items[0].shopId)
        assertThat(foodCollection.items!![0].amount).isEqualTo(data.items[0].amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(data.items[1].categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(data.items[1].shopId)
        assertThat(foodCollection.items!![1].amount).isEqualTo(data.items[1].amount)

        assertThat(foodCollection.items!![2].category!!.id).isEqualTo(data.items[2].categoryId)
        assertThat(foodCollection.items!![2].shop!!.id).isEqualTo(data.items[2].shopId)
        assertThat(foodCollection.items!![2].amount).isEqualTo(data.items[2].amount)

        assertThat(foodCollection.items!![3].category!!.id).isEqualTo(data.items[3].categoryId)
        assertThat(foodCollection.items!![3].shop!!.id).isEqualTo(data.items[3].shopId)
        assertThat(foodCollection.items!![3].amount).isEqualTo(data.items[3].amount)
    }

    @Test
    fun `save items per shop when current data is null`() {
        val routeId = 123L
        val data = FoodCollectionSaveItemsPerShopData(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory1.id!!,
                    amount = 1
                ),
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2
                )
            )
        )

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.saveItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(activeDistribution.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(2)

        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(data.items[0].categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(testShop1.id)
        assertThat(foodCollection.items!![0].amount).isEqualTo(data.items[0].amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(data.items[1].categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(testShop1.id)
        assertThat(foodCollection.items!![1].amount).isEqualTo(data.items[1].amount)
    }

    @Test
    fun `save items per shop with existing data and new item`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop1
            amount = 11
        }
        val existingFoodCollection = FoodCollectionEntity().apply {
            id = 1
            route = testRoute1
            distribution = distributionEntity
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2

        val newData = FoodCollectionSaveItemsPerShopData(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2
                )
            )
        )

        service.saveItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = newData)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(distributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(2)

        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(existingItem.category!!.id)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(existingItem.shop!!.id)
        assertThat(foodCollection.items!![0].amount).isEqualTo(existingItem.amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(newData.items[0].categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(testShop1.id)
        assertThat(foodCollection.items!![1].amount).isEqualTo(newData.items[0].amount)
    }

    @Test
    fun `save items per shop with existing data and updating items`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val existingItems = listOf(
            FoodCollectionItemEntity().apply {
                category = testFoodCategory1
                shop = testShop1
                amount = 11
            },
            FoodCollectionItemEntity().apply {
                category = testFoodCategory2
                shop = testShop1
                amount = 22
            }
        )
        val existingFoodCollection = FoodCollectionEntity().apply {
            id = 1
            route = testRoute1
            distribution = distributionEntity
            items = existingItems
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newData = FoodCollectionSaveItemsPerShopData(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory1.id!!,
                    amount = 1
                ),
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2
                )
            )
        )

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.saveItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = newData)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(distributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(2)

        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(newData.items[0].categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(testShop1.id)
        assertThat(foodCollection.items!![0].amount).isEqualTo(newData.items[0].amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(newData.items[1].categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(testShop1.id)
        assertThat(foodCollection.items!![1].amount).isEqualTo(newData.items[1].amount)
    }

    @Test
    fun `get items per shop without existing data`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        distributionEntity.foodCollections = emptyList()

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        val result = service.getItemsPerShop(routeId = routeId, shopId = testShop1.id!!)
        assertThat(result).isNull()
    }

    @Test
    fun `get items per shop with existing data`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val existingItems = listOf(
            FoodCollectionItemEntity().apply {
                category = testFoodCategory1
                shop = testShop1
                amount = 11
            },
            FoodCollectionItemEntity().apply {
                category = testFoodCategory2
                shop = testShop1
                amount = 22
            }
        )
        val existingFoodCollection = FoodCollectionEntity().apply {
            id = 1
            route = testRoute1
            distribution = distributionEntity
            items = existingItems
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        val result = service.getItemsPerShop(routeId = routeId, shopId = testShop1.id!!)!!

        assertThat(result.items).hasSize(2)

        assertThat(result.items[0].categoryId).isEqualTo(existingItems[0].category!!.id)
        assertThat(result.items[0].shopId).isEqualTo(testShop1.id)
        assertThat(result.items[0].amount).isEqualTo(existingItems[0].amount)

        assertThat(result.items[1].categoryId).isEqualTo(existingItems[1].category!!.id)
        assertThat(result.items[1].shopId).isEqualTo(testShop1.id)
        assertThat(result.items[1].amount).isEqualTo(existingItems[1].amount)
    }

    @Test
    fun `patch a single item when current data is null`() {
        val routeId = 123L
        val data = FoodCollectionItem(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop1.id!!,
            amount = 44
        )

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.patchItem(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(activeDistribution.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(1)
        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(data.categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(data.shopId)
        assertThat(foodCollection.items!![0].amount).isEqualTo(data.amount)
    }

    @Test
    fun `patch a single item with existing data and new item`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop1
            amount = 11
        }
        val existingFoodCollection = FoodCollectionEntity().apply {
            id = 1
            route = testRoute1
            distribution = distributionEntity
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newData = FoodCollectionItem(
            categoryId = testFoodCategory2.id!!,
            shopId = testShop2.id!!,
            amount = 22
        )

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2

        service.patchItem(routeId = routeId, data = newData)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(distributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(2)

        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(existingItem.category!!.id)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(existingItem.shop!!.id)
        assertThat(foodCollection.items!![0].amount).isEqualTo(existingItem.amount)

        assertThat(foodCollection.items!![1].category!!.id).isEqualTo(newData.categoryId)
        assertThat(foodCollection.items!![1].shop!!.id).isEqualTo(newData.shopId)
        assertThat(foodCollection.items!![1].amount).isEqualTo(newData.amount)
    }

    @Test
    fun `patch a single item with existing data and updating an item`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            statistic = DistributionStatisticEntity().apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop1
            amount = 11
        }
        val existingFoodCollection = FoodCollectionEntity().apply {
            id = 1
            route = testRoute1
            distribution = distributionEntity
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newAmount = FoodCollectionItem(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop1.id!!,
            amount = 22
        )

        every { distributionRepository.findFirstByOrderByIdDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.patchItem(routeId = routeId, data = newAmount)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection).isNotNull
        assertThat(foodCollection.distribution!!.id).isEqualTo(distributionEntity.id)
        assertThat(foodCollection.route!!.id).isEqualTo(testRoute1.id)

        assertThat(foodCollection.items).hasSize(1)

        assertThat(foodCollection.items!![0].category!!.id).isEqualTo(newAmount.categoryId)
        assertThat(foodCollection.items!![0].shop!!.id).isEqualTo(newAmount.shopId)
        assertThat(foodCollection.items!![0].amount).isEqualTo(newAmount.amount)
    }

}
