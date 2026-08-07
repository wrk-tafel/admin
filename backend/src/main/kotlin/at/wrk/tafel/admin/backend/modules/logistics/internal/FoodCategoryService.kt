package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryResponse
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class FoodCategoryService(
    private val foodCategoriesRepository: FoodCategoryRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(FoodCategoryService::class.java)
    }

    fun getActiveFoodCategories(): List<FoodCategoryResponse> = sortCategories(foodCategoriesRepository.findByEnabledIsTrue())
        .map { mapFoodCategory(it) }

    fun getAllFoodCategories(): List<FoodCategoryResponse> = sortCategories(foodCategoriesRepository.findAll().toList())
        // Return/deposit item categories ("Kisten") are out of scope for this admin listing -
        // they will get their own dedicated form later.
        .filter { it.returnItem != true }
        .map { mapFoodCategory(it) }

    fun createFoodCategory(category: FoodCategoryRequest): FoodCategoryResponse {
        val entity = FoodCategoryEntity(
            name = category.name,
            sortOrder = nextSortOrder(),
            returnItem = category.returnItem,
            enabled = category.enabled,
        ).apply {
            weightPerUnit = category.weightPerUnit
        }

        val savedEntity = foodCategoriesRepository.save(entity)
        log.info("Created food category {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapFoodCategory(savedEntity)
    }

    fun updateFoodCategory(foodCategoryId: Long, updatedCategory: FoodCategoryRequest): FoodCategoryResponse {
        val entity = foodCategoriesRepository.findByIdOrNull(foodCategoryId)
            ?: throw NotFoundException("FoodCategory with id $foodCategoryId not found")

        entity.name = updatedCategory.name
        entity.weightPerUnit = updatedCategory.weightPerUnit
        entity.returnItem = updatedCategory.returnItem
        entity.sortOrder = updatedCategory.sortOrder
        entity.enabled = updatedCategory.enabled

        val savedEntity = foodCategoriesRepository.save(entity)
        log.info("Updated food category {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapFoodCategory(savedEntity)
    }

    @Transactional
    fun reorderFoodCategories(categoryIds: List<Long>) {
        categoryIds.forEachIndexed { index, categoryId ->
            val entity = foodCategoriesRepository.findByIdOrNull(categoryId)
                ?: throw NotFoundException("FoodCategory with id $categoryId not found")

            entity.sortOrder = index + 1
            foodCategoriesRepository.save(entity)
        }
        log.info("Reordered food categories: {}", categoryIds)
    }

    private fun nextSortOrder(): Int = (
        foodCategoriesRepository.findAll()
            .filter { it.returnItem != true }
            .maxOfOrNull { it.sortOrder } ?: 0
        ) + 1

    private fun sortCategories(categories: List<FoodCategoryEntity>): List<FoodCategoryEntity> = categories
        .sortedWith(
            compareBy(
                { it.returnItem },
                { it.sortOrder },
                { it.name },
            ),
        )

    private fun mapFoodCategory(foodCategoryEntity: FoodCategoryEntity): FoodCategoryResponse = FoodCategoryResponse(
        id = foodCategoryEntity.id,
        name = foodCategoryEntity.name,
        weightPerUnit = foodCategoryEntity.weightPerUnit,
        returnItem = foodCategoryEntity.returnItem,
        sortOrder = foodCategoryEntity.sortOrder,
        enabled = foodCategoryEntity.enabled,
    )
}
