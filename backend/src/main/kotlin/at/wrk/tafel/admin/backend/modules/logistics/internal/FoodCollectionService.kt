package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.*
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class FoodCollectionService(
    private val distributionRepository: DistributionRepository,
    private val foodCollectionRepository: FoodCollectionRepository,
    private val routeRepository: RouteRepository,
    private val employeeRepository: EmployeeRepository,
    private val shopRepository: ShopRepository,
    private val foodCategoryRepository: FoodCategoryRepository,
    private val carRepository: CarRepository,
    private val advisoryLockService: AdvisoryLockService,
) {

    @Transactional(readOnly = true)
    fun getFoodCollection(routeId: Long): FoodCollectionResponse? {
        val distribution = distributionRepository.getCurrentDistribution()!!

        val foodCollection = distribution.foodCollections.firstOrNull { it.route.id == routeId }

        return foodCollection?.let { foodCollection ->
            val driver = foodCollection.driver?.id?.let { driverId ->
                val entity = employeeRepository.findByIdOrNull(driverId)
                entity?.let { mapEmployee(it) }
            }

            val coDriver = foodCollection.coDriver?.id?.let { coDriverId ->
                val entity = employeeRepository.findByIdOrNull(coDriverId)
                entity?.let { mapEmployee(it) }
            }

            FoodCollectionResponse(
                routeId = foodCollection.route.id!!,
                carId = foodCollection.car?.id,
                driver = driver,
                coDriver = coDriver,
                kmStart = foodCollection.kmStart,
                kmEnd = foodCollection.kmEnd,
                items = mapItemsEntityToItems(foodCollection.items ?: emptyList()),
            )
        }
    }

    @Transactional
    fun saveRouteData(routeId: Long, data: FoodCollectionSaveRouteRequest) {
        val distribution = distributionRepository.getCurrentDistribution()!!

        foodCollectionRepository.save(mapRouteData(distribution, routeId, data))
    }

    @Transactional
    fun saveItems(routeId: Long, data: FoodCollectionItemsRequest) {
        val distribution = distributionRepository.getCurrentDistribution()!!

        foodCollectionRepository.save(mapAllItems(distribution, routeId, data))
    }

    @Transactional
    fun saveItemsPerShop(
        routeId: Long,
        shopId: Long,
        data: FoodCollectionSaveItemsPerShopRequest,
    ) {
        val distributionEntity = distributionRepository.getCurrentDistribution()!!

        val foodCollectionEntity = getOrCreateFoodCollectionEntity(distributionEntity, routeId)
        val items = foodCollectionEntity.items?.toMutableList() ?: mutableListOf()
        data.items.forEach { item ->
            updateItems(
                items = items,
                categoryId = item.categoryId,
                shopId = shopId,
                newAmount = item.amount,
            )
        }

        foodCollectionEntity.items = items
        foodCollectionRepository.save(foodCollectionEntity)
    }

    @Transactional(readOnly = true)
    fun getItemsPerShop(routeId: Long, shopId: Long): FoodCollectionItemsResponse? {
        val distributionEntity = distributionRepository.getCurrentDistribution()!!

        val collectionForRoute = distributionEntity.foodCollections.firstOrNull {
            it.route.id == routeId
        }
        collectionForRoute?.let {
            val items = it.items?.filter { item ->
                item.shop.id == shopId
            } ?: emptyList()

            return FoodCollectionItemsResponse(
                items = mapItemsEntityToItems(items),
            )
        }

        return null
    }

    @Transactional
    fun patchItem(routeId: Long, data: FoodCollectionItemRequest) {
        // concurrent auto-save requests for the same category/shop otherwise race on the
        // read-modify-write below and can both try to insert the same item, violating the
        // food_collections_items_pk unique constraint
        advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM) {
            val distributionEntity = distributionRepository.getCurrentDistribution()!!

            val foodCollectionEntity = getOrCreateFoodCollectionEntity(distributionEntity, routeId)
            val items = foodCollectionEntity.items?.toMutableList() ?: mutableListOf()
            updateItems(
                items = items,
                categoryId = data.categoryId,
                shopId = data.shopId,
                newAmount = data.amount,
            )

            foodCollectionEntity.items = items
            foodCollectionRepository.save(foodCollectionEntity)
        }
    }

    private fun updateItems(
        items: MutableList<FoodCollectionItemEntity>,
        categoryId: Long,
        shopId: Long,
        newAmount: Int,
    ) {
        val existingItem = items.firstOrNull {
            it.category.id == categoryId && it.shop.id == shopId
        }
        if (existingItem != null) {
            existingItem.amount = newAmount
        } else {
            items.add(
                FoodCollectionItemEntity(
                    category = foodCategoryRepository.findByIdOrNull(categoryId)
                        ?: throw NotFoundException("Kategorie nicht gefunden!"),
                    shop = shopRepository.findByIdOrNull(shopId)
                        ?: throw NotFoundException("Filiale nicht gefunden!"),
                    amount = newAmount,
                ),
            )
        }
    }

    private fun getOrCreateFoodCollectionEntity(
        distributionEntity: DistributionEntity,
        routeId: Long,
    ): FoodCollectionEntity = distributionEntity.foodCollections.firstOrNull {
        it.route.id == routeId
    } ?: FoodCollectionEntity(
        distribution = distributionEntity,
        route = routeRepository.findByIdOrNull(routeId) ?: throw NotFoundException("Route $routeId nicht gefunden!"),
    )

    private fun mapEmployee(employee: EmployeeEntity): EmployeeResponse = EmployeeResponse(
        id = employee.id!!,
        personnelNumber = employee.personnelNumber,
        firstname = employee.firstname,
        lastname = employee.lastname,
    )

    private fun mapRouteData(
        distributionEntity: DistributionEntity,
        routeId: Long,
        data: FoodCollectionSaveRouteRequest,
    ): FoodCollectionEntity {
        val route = routeRepository.findByIdOrNull(routeId) ?: throw NotFoundException("Route $routeId nicht gefunden!")
        val entity = distributionEntity.foodCollections.firstOrNull {
            it.route.id == routeId
        } ?: FoodCollectionEntity(distribution = distributionEntity, route = route)

        return entity.apply {
            this.distribution = distributionEntity
            this.route = route
            car = carRepository.findByIdOrNull(data.carId)
                ?: throw NotFoundException("KFZ nicht gefunden!")
            driver = employeeRepository.findByIdOrNull(data.driverId)
                ?: throw NotFoundException("Fahrer nicht gefunden!")
            coDriver = employeeRepository.findByIdOrNull(data.coDriverId)
                ?: throw NotFoundException("Beifahrer nicht gefunden!")
            kmStart = data.kmStart
            kmEnd = data.kmEnd
        }
    }

    private fun mapAllItems(
        distributionEntity: DistributionEntity,
        routeId: Long,
        data: FoodCollectionItemsRequest,
    ): FoodCollectionEntity {
        val route = routeRepository.findByIdOrNull(routeId) ?: throw NotFoundException("Route $routeId nicht gefunden!")
        val entity = distributionEntity.foodCollections.firstOrNull {
            it.route.id == routeId
        } ?: FoodCollectionEntity(distribution = distributionEntity, route = route)

        return entity.apply {
            this.distribution = distributionEntity
            this.route = route
            items = mapItemsToEntity(data.items)
        }
    }

    private fun mapItemsToEntity(items: List<FoodCollectionItem>): List<FoodCollectionItemEntity> = items.map {
        FoodCollectionItemEntity(
            category = foodCategoryRepository.findByIdOrNull(it.categoryId)
                ?: throw NotFoundException("Kategorie nicht gefunden!"),
            shop = shopRepository.findByIdOrNull(it.shopId)
                ?: throw NotFoundException("Filiale nicht gefunden!"),
            amount = it.amount,
        )
    }

    private fun mapItemsEntityToItems(items: List<FoodCollectionItemEntity>): List<FoodCollectionItem> = items.map {
        FoodCollectionItem(
            categoryId = it.category.id!!,
            shopId = it.shop.id!!,
            amount = it.amount,
        )
    }
}
