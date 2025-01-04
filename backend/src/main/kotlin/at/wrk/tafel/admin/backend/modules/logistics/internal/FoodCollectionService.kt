package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionData
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionSaveRequest
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

        return foodCollection?.let {
            val driverId = it.driver!!.id!!
            val driverEmployee = employeeRepository.findByIdOrNull(driverId)!!

            val coDriverId = it.coDriver!!.id!!
            val coDriverEmployee = employeeRepository.findByIdOrNull(coDriverId)!!

            FoodCollectionData(
                carId = it.car!!.id!!,
                driver = mapEmployee(driverEmployee),
                coDriver = mapEmployee(coDriverEmployee),
                kmStart = it.kmStart!!,
                kmEnd = it.kmEnd!!,
                items = mapItemsEntityToItems(it.items ?: emptyList())
            )
        }
    }

    private fun mapEmployee(employee: EmployeeEntity): Employee {
        return Employee(
            id = employee.id!!,
            personnelNumber = employee.personnelNumber!!,
            firstname = employee.firstname!!,
            lastname = employee.lastname!!,
        )
    }

    @Transactional
    fun save(request: FoodCollectionSaveRequest) {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        foodCollectionRepository.save(mapToEntity(distribution, request))
    }

    private fun mapToEntity(
        distributionEntity: DistributionEntity,
        request: FoodCollectionSaveRequest
    ): FoodCollectionEntity {
        val entity = distributionEntity.foodCollections.firstOrNull {
            it.route?.id == request.routeId
        } ?: FoodCollectionEntity()

        return entity.apply {
            distribution = distributionEntity
            route = routeRepository.findByIdOrNull(request.routeId)
                ?: throw TafelValidationException("Route ${request.routeId} nicht gefunden!")
            car = carRepository.findByIdOrNull(request.carId)
                ?: throw TafelValidationException("Ungültiges KFZ!")
            driver = employeeRepository.findByIdOrNull(request.driverId)
                ?: throw TafelValidationException("Ungültiger Fahrer!")
            coDriver = employeeRepository.findByIdOrNull(request.coDriverId)
                ?: throw TafelValidationException("Ungültiger Beifahrer!")
            kmStart = request.kmStart
            kmEnd = request.kmEnd
            items = mapItemsToEntity(request.items)
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
