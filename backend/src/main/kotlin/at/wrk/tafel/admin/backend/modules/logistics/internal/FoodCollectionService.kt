package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionData
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionSaveItems
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionSaveRouteData
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
    private val carRepository: CarRepository
) {

    @Transactional
    fun getFoodCollection(routeId: Long): FoodCollectionData? {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val foodCollection = distribution.foodCollections.firstOrNull { it.route?.id == routeId }

        return foodCollection?.let { foodCollection ->
            val driver = foodCollection.driver?.id?.let { driverId ->
                val entity = employeeRepository.findByIdOrNull(driverId)
                entity?.let { mapEmployee(it) }
            }

            val coDriver = foodCollection.coDriver?.id?.let { coDriverId ->
                val entity = employeeRepository.findByIdOrNull(coDriverId)
                entity?.let { mapEmployee(it) }
            }

            FoodCollectionData(
                routeId = foodCollection.route!!.id!!,
                carId = foodCollection.car?.id,
                driver = driver,
                coDriver = coDriver,
                kmStart = foodCollection.kmStart,
                kmEnd = foodCollection.kmEnd,
                items = mapItemsEntityToItems(foodCollection.items ?: emptyList())
            )
        }
    }

    @Transactional
    fun saveRouteData(routeId: Long, data: FoodCollectionSaveRouteData) {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        foodCollectionRepository.save(mapRouteData(distribution, routeId, data))
    }

    @Transactional
    fun saveItems(routeId: Long, data: FoodCollectionSaveItems) {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        foodCollectionRepository.save(mapAllItems(distribution, routeId, data))
    }

    @Transactional
    fun patchItem(routeId: Long, data: FoodCollectionItem) {
        val distributionEntity = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val foodCollectionEntity = distributionEntity.foodCollections.firstOrNull {
            it.route?.id == routeId
        } ?: FoodCollectionEntity().apply {
            distribution = distributionEntity
            route = routeRepository.findByIdOrNull(routeId)
                ?: throw TafelValidationException("Route $routeId nicht gefunden!")
        }

        val itemsList = foodCollectionEntity.items?.toMutableList() ?: mutableListOf()
        val existingItem = itemsList.firstOrNull {
            it.category?.id == data.categoryId && it.shop?.id == data.shopId
        }
        if (existingItem != null) {
            existingItem.amount = data.amount
        } else {
            itemsList.add(FoodCollectionItemEntity().apply {
                category = foodCategoryRepository.findByIdOrNull(data.categoryId)
                    ?: throw TafelValidationException("Kategorie ungültig!")
                shop = shopRepository.findByIdOrNull(data.shopId)
                    ?: throw TafelValidationException("Filiale ungültig!")
                amount = data.amount
            })
        }

        foodCollectionEntity.items = itemsList
        foodCollectionRepository.save(foodCollectionEntity)
    }

    private fun mapEmployee(employee: EmployeeEntity): Employee {
        return Employee(
            id = employee.id!!,
            personnelNumber = employee.personnelNumber!!,
            firstname = employee.firstname!!,
            lastname = employee.lastname!!,
        )
    }

    private fun mapRouteData(
        distributionEntity: DistributionEntity,
        routeId: Long,
        data: FoodCollectionSaveRouteData
    ): FoodCollectionEntity {
        val entity = distributionEntity.foodCollections.firstOrNull {
            it.route?.id == routeId
        } ?: FoodCollectionEntity()

        return entity.apply {
            distribution = distributionEntity
            route = routeRepository.findByIdOrNull(routeId)
                ?: throw TafelValidationException("Route $routeId nicht gefunden!")
            car = carRepository.findByIdOrNull(data.carId)
                ?: throw TafelValidationException("Ungültiges KFZ!")
            driver = employeeRepository.findByIdOrNull(data.driverId)
                ?: throw TafelValidationException("Ungültiger Fahrer!")
            coDriver = employeeRepository.findByIdOrNull(data.coDriverId)
                ?: throw TafelValidationException("Ungültiger Beifahrer!")
            kmStart = data.kmStart
            kmEnd = data.kmEnd
        }
    }

    private fun mapAllItems(
        distributionEntity: DistributionEntity,
        routeId: Long,
        data: FoodCollectionSaveItems
    ): FoodCollectionEntity {
        val entity = distributionEntity.foodCollections.firstOrNull {
            it.route?.id == routeId
        } ?: FoodCollectionEntity()

        return entity.apply {
            distribution = distributionEntity
            route = routeRepository.findByIdOrNull(routeId)
                ?: throw TafelValidationException("Route $routeId nicht gefunden!")
            items = mapItemsToEntity(data.items)
        }
    }

    private fun mapItemsToEntity(items: List<FoodCollectionItem>): List<FoodCollectionItemEntity> {
        return items.map {
            FoodCollectionItemEntity().apply {
                category = foodCategoryRepository.findByIdOrNull(it.categoryId)
                    ?: throw TafelValidationException("Kategorie ungültig!")
                shop = shopRepository.findByIdOrNull(it.shopId)
                    ?: throw TafelValidationException("Filiale ungültig!")
                amount = it.amount
            }
        }
    }

    private fun mapItemsEntityToItems(items: List<FoodCollectionItemEntity>): List<FoodCollectionItem> {
        return items.map {
            FoodCollectionItem(
                categoryId = it.category!!.id!!,
                shopId = it.shop!!.id!!,
                amount = it.amount ?: 0
            )
        }
    }

}
