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
import org.slf4j.LoggerFactory
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

    companion object {
        private val log = LoggerFactory.getLogger(FoodCollectionService::class.java)
    }

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
                returnItems = mapReturnItemsEntityToReturnItems(foodCollection.returnItems ?: emptyList()),
            )
        }
    }

    @Transactional
    fun saveRouteData(routeId: Long, data: FoodCollectionSaveRouteRequest) {
        val distribution = distributionRepository.getCurrentDistribution()!!

        foodCollectionRepository.save(mapRouteData(distribution, routeId, data))
        log.info(
            "Saved food collection route data for route {} (distribution: {}, car: {}, driver: {}, coDriver: {})",
            routeId,
            distribution.id,
            data.carId,
            data.driverId,
            data.coDriverId,
        )
    }

    @Transactional
    fun saveKm(routeId: Long, data: FoodCollectionSaveKmRequest) {
        val distribution = distributionRepository.getCurrentDistribution()!!

        val foodCollectionEntity = getOrCreateFoodCollectionEntity(distribution, routeId)
        foodCollectionEntity.kmStart = data.kmStart
        foodCollectionEntity.kmEnd = data.kmEnd

        foodCollectionRepository.save(foodCollectionEntity)
        log.info(
            "Saved food collection km for route {} (distribution: {}, kmStart: {}, kmEnd: {})",
            routeId,
            distribution.id,
            data.kmStart,
            data.kmEnd,
        )
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

    @Transactional
    fun saveReturnItems(routeId: Long, data: FoodCollectionSaveReturnItemsRequest) {
        advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS) {
            val distributionEntity = distributionRepository.getCurrentDistribution()!!

            val foodCollectionEntity = getOrCreateFoodCollectionEntity(distributionEntity, routeId)
            foodCollectionEntity.returnItems = mapReturnItemsToEntity(data.returnItems)

            foodCollectionRepository.save(foodCollectionEntity)
        }
    }

    @Transactional
    fun saveReturnItemsPerShop(
        routeId: Long,
        shopId: Long,
        data: FoodCollectionSaveReturnItemsPerShopRequest,
    ) {
        // the whole element collection is rewritten below, so a concurrent save for another shop
        // of the same route would drop the rows this one just wrote (and vice versa)
        advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS) {
            val distributionEntity = distributionRepository.getCurrentDistribution()!!

            val foodCollectionEntity = getOrCreateFoodCollectionEntity(distributionEntity, routeId)
            val otherShopsReturnItems = foodCollectionEntity.returnItems
                ?.filter { it.shop.id != shopId } ?: emptyList()
            val shopReturnItems = mapReturnItemsToEntity(
                data.returnItems.map {
                    FoodCollectionReturnItem(
                        shopId = shopId,
                        description = it.description,
                        amount = it.amount,
                    )
                },
            )

            foodCollectionEntity.returnItems = otherShopsReturnItems + shopReturnItems
            foodCollectionRepository.save(foodCollectionEntity)
        }
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
            val returnItems = it.returnItems?.filter { returnItem ->
                returnItem.shop.id == shopId
            } ?: emptyList()

            return FoodCollectionItemsResponse(
                items = mapItemsEntityToItems(items),
                returnItems = mapReturnItemsEntityToReturnItems(returnItems),
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

    /**
     * Only return boxes that were actually counted are stored - a zero amount is the absence of a
     * row, which is what keeps the free-text list from filling up with empty entries every time a
     * shop is saved.
     */
    private fun mapReturnItemsToEntity(
        returnItems: List<FoodCollectionReturnItem>,
    ): List<FoodCollectionReturnItemEntity> = returnItems
        .filter { it.amount > 0 && it.description.isNotBlank() }
        .map {
            FoodCollectionReturnItemEntity(
                shop = shopRepository.findByIdOrNull(it.shopId)
                    ?: throw NotFoundException("Filiale nicht gefunden!"),
                description = it.description.trim(),
                amount = it.amount,
            )
        }

    private fun mapReturnItemsEntityToReturnItems(
        returnItems: List<FoodCollectionReturnItemEntity>,
    ): List<FoodCollectionReturnItem> = returnItems.map {
        FoodCollectionReturnItem(
            shopId = it.shop.id!!,
            description = it.description,
            amount = it.amount,
        )
    }
}
