package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class FoodCategoryService(
    private val foodCategoriesRepository: FoodCategoryRepository,
) {

    fun getActiveFoodCategories(): List<FoodCategory> = sortCategories(foodCategoriesRepository.findByEnabledIsTrue())
        .map { mapFoodCategory(it) }

    fun getAllFoodCategories(): List<FoodCategory> = sortCategories(foodCategoriesRepository.findAll().toList())
        // Return/deposit item categories ("Kisten") are out of scope for this admin listing -
        // they will get their own dedicated form later.
        .filter { it.returnItem != true }
        .map { mapFoodCategory(it) }

    fun createFoodCategory(category: FoodCategory): FoodCategory {
        val entity = FoodCategoryEntity().apply {
            name = category.name
            weightPerUnit = category.weightPerUnit
            returnItem = category.returnItem
            sortOrder = nextSortOrder()
            enabled = category.enabled
        }

        val savedEntity = foodCategoriesRepository.save(entity)
        return mapFoodCategory(savedEntity)
    }

    fun updateFoodCategory(categoryId: Long, updatedCategory: FoodCategory): FoodCategory {
        val entity = foodCategoriesRepository.findByIdOrNull(categoryId)
            ?: throw TafelValidationException("FoodCategory with id $categoryId not found")

        entity.name = updatedCategory.name
        entity.weightPerUnit = updatedCategory.weightPerUnit
        entity.returnItem = updatedCategory.returnItem
        entity.sortOrder = updatedCategory.sortOrder
        entity.enabled = updatedCategory.enabled

        val savedEntity = foodCategoriesRepository.save(entity)
        return mapFoodCategory(savedEntity)
    }

    @Transactional
    fun reorderFoodCategories(categoryIds: List<Long>) {
        categoryIds.forEachIndexed { index, categoryId ->
            val entity = foodCategoriesRepository.findByIdOrNull(categoryId)
                ?: throw TafelValidationException("FoodCategory with id $categoryId not found")

            entity.sortOrder = index + 1
            foodCategoriesRepository.save(entity)
        }
    }

    private fun nextSortOrder(): Int = (
        foodCategoriesRepository.findAll()
            .filter { it.returnItem != true }
            .maxOfOrNull { it.sortOrder ?: 0 } ?: 0
        ) + 1

    private fun sortCategories(categories: List<FoodCategoryEntity>): List<FoodCategoryEntity> = categories
        .sortedWith(
            compareBy(
                { it.returnItem },
                { it.sortOrder },
                { it.name },
            ),
        )

    private fun mapFoodCategory(foodCategoryEntity: FoodCategoryEntity): FoodCategory = FoodCategory(
        id = foodCategoryEntity.id,
        name = foodCategoryEntity.name!!,
        weightPerUnit = foodCategoryEntity.weightPerUnit,
        returnItem = foodCategoryEntity.returnItem ?: false,
        sortOrder = foodCategoryEntity.sortOrder ?: 0,
        enabled = foodCategoryEntity.enabled ?: false,
    )
}
