package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import org.springframework.stereotype.Service

@Service
class FoodCategoriesService(
    private val foodCategoriesRepository: FoodCategoryRepository
) {

    fun getFoodCategories(): List<FoodCategory> {
        val routes = foodCategoriesRepository.findAll()
        return routes.map { mapRoute(it) }
    }

    private fun mapRoute(foodCategoryEntity: FoodCategoryEntity): FoodCategory {
        return FoodCategory(
            id = foodCategoryEntity.id!!,
            name = foodCategoryEntity.name!!,
        )
    }

}
