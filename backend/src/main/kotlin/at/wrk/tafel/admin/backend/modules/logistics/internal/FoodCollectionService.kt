package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionsRequest
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
    private val foodCategoryRepository: FoodCategoryRepository
) {

    @Transactional
    fun getFoodCollectionItems(routeId: Long): List<FoodCollectionItem> {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val foodCollectionsForRoute = distribution.foodCollections.firstOrNull { it.route?.id == routeId }
        return foodCollectionsForRoute?.let { mapItemsEntityToItems(it.items ?: emptyList()) } ?: emptyList()
    }

    @Transactional
    fun save(request: FoodCollectionsRequest) {
        val distribution = distributionRepository.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")
        val route = routeRepository.findByIdOrNull(request.routeId)
            ?: throw TafelValidationException("Route ${request.routeId} nicht gefunden!")

        if (foodCollectionRepository.existsByDistributionAndRoute(distribution = distribution, route = route)) {
            throw TafelValidationException("Waren zur Route '${route.name}' sind bereits erfasst!")
        }

        foodCollectionRepository.save(mapToEntity(distribution, request))
    }

    private fun mapToEntity(
        distributionEntity: DistributionEntity,
        request: FoodCollectionsRequest
    ): FoodCollectionEntity {
        return FoodCollectionEntity().apply {
            distribution = distributionEntity
            route = routeRepository.findByIdOrNull(request.routeId)
                ?: throw TafelValidationException("Ungültige Route!")
            carLicensePlate = request.carLicensePlate
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
