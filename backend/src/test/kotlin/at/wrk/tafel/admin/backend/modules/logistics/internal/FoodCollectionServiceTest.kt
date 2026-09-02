package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import at.wrk.tafel.admin.backend.modules.logistics.*
import at.wrk.tafel.admin.backend.modules.logistics.events.FoodCollectionCompletedEvent
import at.wrk.tafel.admin.backend.modules.logistics.model.*
import at.wrk.tafel.admin.backend.security.testUserEntity
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
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

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    @InjectMockKs
    private lateinit var service: FoodCollectionService

    @BeforeEach
    fun setUp() {
        every { advisoryLockService.withLock(any(), any<() -> Any?>()) } answers {
            secondArg<() -> Any?>().invoke()
        }
    }

    @Test
    fun `get food collection data`() {
        val routeId = testFoodCollectionRoute1Entity.route!!.id!!
        every { employeeRepository.findByIdOrNull(testEmployee1.id!!) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(testEmployee2.id!!) } returns testEmployee2

        val distributionMock = mockk<DistributionEntity>()
        every { distributionMock.foodCollections } returns listOf(testFoodCollectionRoute1Entity)
        every { distributionMock.endedAt } returns null
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionMock

        val data = service.getFoodCollection(routeId)!!

        assertThat(data.carId).isEqualTo(testFoodCollectionRoute1Entity.car!!.id)
        assertThat(data.driver).isEqualTo(
            EmployeeResponse(
                id = testFoodCollectionRoute1Entity.driver!!.id!!,
                personnelNumber = testEmployee1.personnelNumber!!,
                firstname = testEmployee1.firstname!!,
                lastname = testEmployee1.lastname!!,
            ),
        )
        assertThat(data.coDriver).isEqualTo(
            EmployeeResponse(
                id = testFoodCollectionRoute1Entity.coDriver!!.id!!,
                personnelNumber = testEmployee2.personnelNumber!!,
                firstname = testEmployee2.firstname!!,
                lastname = testEmployee2.lastname!!,
            ),
        )
        assertThat(data.kmStart).isEqualTo(testFoodCollectionRoute1Entity.kmStart)
        assertThat(data.kmEnd).isEqualTo(testFoodCollectionRoute1Entity.kmEnd)
        assertThat(data.items).hasSize(testFoodCollectionRoute1Entity.items!!.size)

        assertThat(data.items[1]).isEqualTo(
            FoodCollectionItem(
                categoryId = 1,
                shopId = 2,
                amount = 2,
            ),
        )
        assertThat(data.items[2]).isEqualTo(
            FoodCollectionItem(
                categoryId = 3,
                shopId = 1,
                amount = 0,
            ),
        )
        assertThat(data.returnItems).containsExactly(
            FoodCollectionReturnItem(shopId = testShop1.id!!, description = "Graue Kisten", amount = 3),
            FoodCollectionReturnItem(shopId = testShop2.id!!, description = "Bananenkartons", amount = 1),
        )
    }

    @Test
    fun `save return items replaces all return items of the route`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsRequest(
            returnItems = listOf(
                FoodCollectionReturnItem(shopId = testShop1.id!!, description = "  Graue Kisten  ", amount = 3),
                FoodCollectionReturnItem(shopId = testShop2.id!!, description = "Bananenkartons", amount = 0),
                FoodCollectionReturnItem(shopId = testShop2.id!!, description = "Sonstige", amount = 2),
            ),
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
            returnItems = listOf(
                FoodCollectionReturnItemEntity(shop = testShop1, description = "Alte Kisten", amount = 9),
            )
        }
        distributionEntity.foodCollections = mutableListOf(existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveReturnItems(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        // the zero amount is dropped and the description is trimmed
        val returnItems = foodCollectionSlot.captured.returnItems!!
        assertThat(returnItems).hasSize(2)
        assertThat(returnItems[0].shop.id).isEqualTo(testShop1.id)
        assertThat(returnItems[0].description).isEqualTo("Graue Kisten")
        assertThat(returnItems[0].amount).isEqualTo(3)
        assertThat(returnItems[1].description).isEqualTo("Sonstige")
    }

    @Test
    fun `save return items with invalid shop`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsRequest(
            returnItems = listOf(FoodCollectionReturnItem(shopId = 999L, description = "Kiste", amount = 1)),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        // a shop id that isn't a stop of the route at all is now rejected by that check before the
        // save ever gets to looking the shop up on its own (see #3527/#3559)
        val exception = assertThrows<BusinessRuleException> { service.saveReturnItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save return items per shop keeps the return items of the other shops`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsPerShopRequest(
            returnItems = listOf(
                FoodCollectionReturnItemAmount(description = "Graue Kisten", amount = 5),
                FoodCollectionReturnItemAmount(description = "Leere Kiste", amount = 0),
            ),
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
            returnItems = listOf(
                FoodCollectionReturnItemEntity(shop = testShop1, description = "Alte Kisten", amount = 9),
                FoodCollectionReturnItemEntity(shop = testShop2, description = "Bananenkartons", amount = 1),
            )
        }
        distributionEntity.foodCollections = mutableListOf(existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveReturnItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val returnItems = foodCollectionSlot.captured.returnItems!!
        assertThat(returnItems).hasSize(2)
        assertThat(returnItems[0].shop.id).isEqualTo(testShop2.id)
        assertThat(returnItems[0].description).isEqualTo("Bananenkartons")
        assertThat(returnItems[1].shop.id).isEqualTo(testShop1.id)
        assertThat(returnItems[1].description).isEqualTo("Graue Kisten")
        assertThat(returnItems[1].amount).isEqualTo(5)
    }

    @Test
    fun `save route data with invalid route`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<NotFoundException> { service.saveRouteData(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `save route data`() {
        val routeId = 123L
        val driverId = 1L
        val coDriverId = 2L
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
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

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    @Test
    fun `save km`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveKmRequest(kmStart = 1000, kmEnd = 2000)
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
        }
        distributionEntity.foodCollections = mutableListOf(existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveKm(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }

        val foodCollection = foodCollectionSlot.captured
        assertThat(foodCollection.id).isEqualTo(existingCollection.id)
        assertThat(foodCollection.kmStart).isEqualTo(1000)
        assertThat(foodCollection.kmEnd).isEqualTo(2000)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    /**
     * Regression guard (issue #3602): saveRouteData/saveKm used to take no lock at all, so their
     * find-or-create of the route's food_collections row could race saveItems/saveItemsPerShop/
     * patchItem (or each other) on the `(distribution_id, route_id)` unique constraint.
     */
    @Test
    fun `save route data takes the same advisory lock as saveKm and the item write paths`() {
        val routeId = 123L
        val data = FoodCollectionSaveRouteRequest(carId = testCar1.id!!, driverId = 1L, coDriverId = 2L)
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { employeeRepository.findByIdOrNull(data.driverId) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(data.coDriverId) } returns testEmployee2
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1

        service.saveRouteData(routeId = routeId, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    @Test
    fun `save km takes the same advisory lock as saveRouteData and the item write paths`() {
        val routeId = 123L
        val data = FoodCollectionSaveKmRequest(kmStart = 1000, kmEnd = 2000)
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveKm(routeId = routeId, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    @Test
    fun `save km creates the food collection when the route has none yet`() {
        val routeId = 123L
        val data = FoodCollectionSaveKmRequest(kmStart = 1000, kmEnd = 2000)
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveKm(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }
        assertThat(foodCollectionSlot.captured.route!!.id).isEqualTo(testRoute1.id)
        assertThat(foodCollectionSlot.captured.kmStart).isEqualTo(1000)
    }

    @Test
    fun `save km with invalid route`() {
        val routeId = 123L
        val data = FoodCollectionSaveKmRequest(kmStart = 1000, kmEnd = 2000)
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<NotFoundException> { service.saveKm(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `save route data logs the save`() {
        val routeId = 123L
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = testEmployee1.id!!,
            coDriverId = testEmployee2.id!!,
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { employeeRepository.findByIdOrNull(data.driverId) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(data.coDriverId) } returns testEmployee2
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1

        val logger = LoggerFactory.getLogger(FoodCollectionService::class.java) as Logger
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)

        try {
            service.saveRouteData(routeId = routeId, data = data)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage)
                    .contains("Saved food collection route data")
                    .contains(routeId.toString())
                    .contains(activeDistribution.id.toString())
            }
        } finally {
            logger.detachAppender(logAppender)
        }
    }

    @Test
    fun `save items with invalid route`() {
        val routeId = 123L
        val data = FoodCollectionItemsRequest(
            items = emptyList(),
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<NotFoundException> { service.saveItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `save items`() {
        val routeId = 123L
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = testShop1.id!!,
                    amount = 1,
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory2.id!!,
                    shopId = testShop1.id!!,
                    amount = 2,
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = testShop2.id!!,
                    amount = 3,
                ),
                FoodCollectionItem(
                    categoryId = testFoodCategory2.id!!,
                    shopId = testShop2.id!!,
                    amount = 4,
                ),
            ),
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
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
        val data = FoodCollectionSaveItemsPerShopRequest(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory1.id!!,
                    amount = 1,
                ),
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2,
                ),
            ),
        )

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory1, amount = 11)
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory2.id!!) } returns testFoodCategory2
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { shopRepository.findByIdOrNull(testShop2.id!!) } returns testShop2

        val newData = FoodCollectionSaveItemsPerShopRequest(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2,
                ),
            ),
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        val existingItems = listOf(
            FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory1, amount = 11),
            FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory2, amount = 22),
        )
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = existingItems
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newData = FoodCollectionSaveItemsPerShopRequest(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory1.id!!,
                    amount = 1,
                ),
                FoodCollectionCategoryAmount(
                    categoryId = testFoodCategory2.id!!,
                    amount = 2,
                ),
            ),
        )

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        distributionEntity.foodCollections = emptyList()

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        val existingItems = listOf(
            FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory1, amount = 11),
            FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory2, amount = 22),
        )
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = existingItems
            returnItems = listOf(
                FoodCollectionReturnItemEntity(shop = testShop1, description = "Graue Kisten", amount = 3),
                FoodCollectionReturnItemEntity(shop = testShop2, description = "Bananenkartons", amount = 1),
            )
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        val result = service.getItemsPerShop(routeId = routeId, shopId = testShop1.id!!)!!

        assertThat(result.items).hasSize(2)
        assertThat(result.returnItems).containsExactly(
            FoodCollectionReturnItem(shopId = testShop1.id!!, description = "Graue Kisten", amount = 3),
        )

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
        val data = FoodCollectionItemRequest(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop1.id!!,
            amount = 44,
        )

        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory1, amount = 11)
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newData = FoodCollectionItemRequest(
            categoryId = testFoodCategory2.id!!,
            shopId = testShop2.id!!,
            amount = 22,
        )

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
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
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            statistic = DistributionStatisticEntity(distribution = this).apply {
                employeeCount = 100
                shelters = listOf(
                    testDistributionStatisticShelterEntity1,
                    testDistributionStatisticShelterEntity2,
                ).toMutableList()
            }
        }
        val existingItem = FoodCollectionItemEntity(shop = testShop1, category = testFoodCategory1, amount = 11)
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = mutableListOf(existingItem)
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        val newAmount = FoodCollectionItemRequest(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop1.id!!,
            amount = 22,
        )

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
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

    @Test
    fun `get items per shop with existing collection but no items returns empty list`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
            items = null
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        val result = service.getItemsPerShop(routeId = routeId, shopId = testShop1.id!!)!!

        assertThat(result.items).isEmpty()
    }

    @Test
    fun `patch a single item with unknown route throws exception`() {
        val routeId = 123L
        val data = FoodCollectionItemRequest(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop1.id!!,
            amount = 1,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<NotFoundException> { service.patchItem(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Route 123 nicht gefunden!")
    }

    @Test
    fun `patch a single item with invalid category throws exception`() {
        val routeId = 123L
        val data = FoodCollectionItemRequest(
            categoryId = 999L,
            shopId = testShop1.id!!,
            amount = 1,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCategoryRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> { service.patchItem(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Kategorie nicht gefunden!")
    }

    @Test
    fun `patch a single item with invalid shop throws exception`() {
        val routeId = 123L
        val data = FoodCollectionItemRequest(
            categoryId = testFoodCategory1.id!!,
            shopId = 999L,
            amount = 1,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        // a shop id that isn't a stop of the route at all is now rejected by that check before the
        // patch ever gets to looking the shop up on its own (see #3527)
        val exception = assertThrows<BusinessRuleException> { service.patchItem(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `patch a single item with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionItemRequest(
            categoryId = testFoodCategory1.id!!,
            shopId = testShop3.id!!,
            amount = 1,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val exception = assertThrows<BusinessRuleException> { service.patchItem(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save items takes the same advisory lock as patchItem and saveItemsPerShop`() {
        val routeId = 123L
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(categoryId = testFoodCategory1.id!!, shopId = testShop1.id!!, amount = 1),
            ),
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.saveItems(routeId = routeId, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    /**
     * Regression guard (issue #3628): saveReturnItems/saveReturnItemsPerShop used to take only
     * SAVE_FOOD_COLLECTION_RETURN_ITEMS, which serialized them against each other but not against
     * saveRouteData/saveKm/saveItems/saveItemsPerShop/patchItem - all of which can also
     * find-or-create the same route's food_collections row under PATCH_FOOD_COLLECTION_ITEM.
     */
    @Test
    fun `save return items takes both the shared item lock and the return-items lock`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsRequest(
            returnItems = listOf(FoodCollectionReturnItem(shopId = testShop1.id!!, description = "Kiste", amount = 1)),
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
        }
        distributionEntity.foodCollections = mutableListOf(existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveReturnItems(routeId = routeId, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS, any<() -> Unit>())
        }
    }

    @Test
    fun `save return items per shop takes both the shared item lock and the return-items lock`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsPerShopRequest(
            returnItems = listOf(FoodCollectionReturnItemAmount(description = "Kiste", amount = 1)),
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
        }
        distributionEntity.foodCollections = mutableListOf(existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveReturnItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS, any<() -> Unit>())
        }
    }

    @Test
    fun `save items per shop takes the same advisory lock as patchItem`() {
        val routeId = 123L
        val data = FoodCollectionSaveItemsPerShopRequest(
            items = listOf(FoodCollectionCategoryAmount(categoryId = testFoodCategory1.id!!, amount = 1)),
        )
        val activeDistribution = testDistributionEntity.apply { endedAt = null }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1

        service.saveItemsPerShop(routeId = routeId, shopId = testShop1.id!!, data = data)

        verify(exactly = 1) {
            advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM, any<() -> Unit>())
        }
    }

    @Test
    fun `save items with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(categoryId = testFoodCategory1.id!!, shopId = testShop3.id!!, amount = 1),
            ),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val exception = assertThrows<BusinessRuleException> { service.saveItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save return items with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsRequest(
            returnItems = listOf(FoodCollectionReturnItem(shopId = testShop3.id!!, description = "Kiste", amount = 1)),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val exception = assertThrows<BusinessRuleException> { service.saveReturnItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save items per shop with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveItemsPerShopRequest(
            items = listOf(FoodCollectionCategoryAmount(categoryId = testFoodCategory1.id!!, amount = 1)),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val exception = assertThrows<BusinessRuleException> {
            service.saveItemsPerShop(routeId = routeId, shopId = testShop3.id!!, data = data)
        }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save return items per shop with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionSaveReturnItemsPerShopRequest(
            returnItems = listOf(FoodCollectionReturnItemAmount(description = "Graue Kisten", amount = 1)),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val exception = assertThrows<BusinessRuleException> {
            service.saveReturnItemsPerShop(routeId = routeId, shopId = testShop3.id!!, data = data)
        }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `get items per shop with a shop that is not a stop of the route throws exception`() {
        val routeId = testRoute1.id!!
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val existingFoodCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 1
        }
        distributionEntity.foodCollections = mutableListOf(existingFoodCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        val exception = assertThrows<BusinessRuleException> {
            service.getItemsPerShop(routeId = routeId, shopId = testShop3.id!!)
        }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    @Test
    fun `save route data reuses the existing food collection for the route`() {
        val routeId = testRoute1.id!!
        val driverId = testEmployee1.id!!
        val coDriverId = testEmployee2.id!!
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = driverId,
            coDriverId = coDriverId,
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val otherRouteCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute2).apply {
            id = 1
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
        }
        distributionEntity.foodCollections = mutableListOf(otherRouteCollection, existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { employeeRepository.findByIdOrNull(driverId) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(coDriverId) } returns testEmployee2
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveRouteData(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }
        assertThat(foodCollectionSlot.captured.id).isEqualTo(existingCollection.id)
    }

    @Test
    fun `save route data with invalid car throws exception`() {
        val routeId = 123L
        val data = FoodCollectionSaveRouteRequest(
            carId = 999L,
            driverId = testEmployee1.id!!,
            coDriverId = testEmployee2.id!!,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { carRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.saveRouteData(routeId = routeId, data = data)
        }
        assertThat(exception.body.detail).isEqualTo("KFZ nicht gefunden!")
    }

    @Test
    fun `save route data with invalid driver throws exception`() {
        val routeId = 123L
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = 999L,
            coDriverId = testEmployee2.id!!,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1
        every { employeeRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.saveRouteData(routeId = routeId, data = data)
        }
        assertThat(exception.body.detail).isEqualTo("Fahrer nicht gefunden!")
    }

    @Test
    fun `save route data with invalid coDriver throws exception`() {
        val routeId = 123L
        val data = FoodCollectionSaveRouteRequest(
            carId = testCar1.id!!,
            driverId = testEmployee1.id!!,
            coDriverId = 999L,
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { carRepository.findByIdOrNull(testCar1.id!!) } returns testCar1
        every { employeeRepository.findByIdOrNull(testEmployee1.id!!) } returns testEmployee1
        every { employeeRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.saveRouteData(routeId = routeId, data = data)
        }
        assertThat(exception.body.detail).isEqualTo("Beifahrer nicht gefunden!")
    }

    @Test
    fun `save items reuses the existing food collection for the route`() {
        val routeId = testRoute1.id!!
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = testShop1.id!!,
                    amount = 1,
                ),
            ),
        )
        val distributionEntity = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val otherRouteCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute2).apply {
            id = 1
        }
        val existingCollection = FoodCollectionEntity(distribution = distributionEntity, route = testRoute1).apply {
            id = 2
        }
        distributionEntity.foodCollections = mutableListOf(otherRouteCollection, existingCollection)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { foodCollectionRepository.save(any()) } returns mockk()

        service.saveItems(routeId = routeId, data = data)

        val foodCollectionSlot = slot<FoodCollectionEntity>()
        verify(exactly = 1) { foodCollectionRepository.save(capture(foodCollectionSlot)) }
        assertThat(foodCollectionSlot.captured.id).isEqualTo(existingCollection.id)
    }

    @Test
    fun `save items with invalid category throws exception`() {
        val routeId = 123L
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(
                    categoryId = 999L,
                    shopId = testShop1.id!!,
                    amount = 1,
                ),
            ),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCategoryRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> { service.saveItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Kategorie nicht gefunden!")
    }

    @Test
    fun `save items with invalid shop throws exception`() {
        val routeId = 123L
        val data = FoodCollectionItemsRequest(
            items = listOf(
                FoodCollectionItem(
                    categoryId = testFoodCategory1.id!!,
                    shopId = 999L,
                    amount = 1,
                ),
            ),
        )
        val activeDistribution = testDistributionEntity.apply {
            endedAt = null
            foodCollections = emptyList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns activeDistribution
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1
        every { foodCategoryRepository.findByIdOrNull(testFoodCategory1.id!!) } returns testFoodCategory1

        // a shop id that isn't a stop of the route at all is now rejected by that check before the
        // save ever gets to looking the shop up on its own (see #3527/#3559)
        val exception = assertThrows<BusinessRuleException> { service.saveItems(routeId = routeId, data = data) }
        assertThat(exception.body.detail).isEqualTo("Filiale ist keine Station dieser Route!")
    }

    /**
     * The completion check queries the food collections rather than reading them off the
     * distribution, because the save that just happened is what may have completed them - so the
     * stub has to answer that query, not only the current-distribution call.
     */
    private fun distributionWithRecordedRoutes(vararg foodCollections: FoodCollectionEntity): DistributionEntity {
        val distribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 99
            this.foodCollections = foodCollections.toList()
        }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distribution
        every { foodCollectionRepository.findAllByDistributionId(99L) } returns foodCollections.toList()
        // saveKm, the save these tests drive the check through, looks the route up to attach it to a
        // newly created collection and then persists it.
        every { routeRepository.findByIdOrNull(any()) } returns testRoute1
        every { foodCollectionRepository.save(any()) } returns mockk()
        return distribution
    }

    private fun fullyRecordedCollectionFor(route: RouteEntity) = FoodCollectionEntity(
        distribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity),
        route = route,
    ).apply {
        car = testCar1
        driver = testEmployee1
        coDriver = testEmployee2
        kmStart = 100
        kmEnd = 200
        items = listOf(FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop1, amount = 5))
    }

    @Test
    fun `publishes FoodCollectionCompletedEvent once every enabled route is fully recorded`() {
        val route = testRoute1
        val distribution = distributionWithRecordedRoutes(fullyRecordedCollectionFor(route))
        every { routeRepository.findByEnabledIsTrue() } returns listOf(route)
        every { distributionRepository.markFoodCollectionCompleted(99L, any()) } returns 1

        service.saveKm(routeId = route.id!!, data = FoodCollectionSaveKmRequest(kmStart = 100, kmEnd = 200))

        verify {
            eventPublisher.publishEvent(FoodCollectionCompletedEvent(distributionId = distribution.id!!, routeCount = 1))
        }
    }

    @Test
    fun `publishes nothing while an enabled route is still unrecorded`() {
        val recorded = testRoute1
        val missing = testRoute2
        distributionWithRecordedRoutes(fullyRecordedCollectionFor(recorded))
        every { routeRepository.findByEnabledIsTrue() } returns listOf(recorded, missing)

        service.saveKm(routeId = recorded.id!!, data = FoodCollectionSaveKmRequest(kmStart = 100, kmEnd = 200))

        verify(exactly = 0) { eventPublisher.publishEvent(any<FoodCollectionCompletedEvent>()) }
    }

    /**
     * A later correction to an already-complete recording must not announce completion a second
     * time - the stamp has been taken, so the conditional UPDATE matches nothing.
     */
    @Test
    fun `publishes nothing a second time once completion was already stamped`() {
        val route = testRoute1
        distributionWithRecordedRoutes(fullyRecordedCollectionFor(route))
        every { routeRepository.findByEnabledIsTrue() } returns listOf(route)
        every { distributionRepository.markFoodCollectionCompleted(any(), any()) } returns 0

        service.saveKm(routeId = route.id!!, data = FoodCollectionSaveKmRequest(kmStart = 100, kmEnd = 200))

        verify(exactly = 0) { eventPublisher.publishEvent(any<FoodCollectionCompletedEvent>()) }
    }

    /**
     * No enabled routes at all is a misconfigured distribution, not a completed one - announcing
     * completion there would fire on the very first save of a day with nothing set up.
     */
    @Test
    fun `publishes nothing when there are no enabled routes at all`() {
        distributionWithRecordedRoutes()
        every { routeRepository.findByEnabledIsTrue() } returns emptyList()

        service.saveKm(routeId = 1L, data = FoodCollectionSaveKmRequest(kmStart = 100, kmEnd = 200))

        verify(exactly = 0) { eventPublisher.publishEvent(any<FoodCollectionCompletedEvent>()) }
    }
}
