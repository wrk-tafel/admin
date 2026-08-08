package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryResponse
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class FoodReturnCategoryService(
    private val foodReturnCategoryRepository: FoodReturnCategoryRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(FoodReturnCategoryService::class.java)
    }

    fun getActiveFoodReturnCategories(): List<FoodReturnCategoryResponse> = sortCategories(foodReturnCategoryRepository.findByEnabledIsTrue())
        .map { mapFoodReturnCategory(it) }

    fun getAllFoodReturnCategories(): List<FoodReturnCategoryResponse> = sortCategories(foodReturnCategoryRepository.findAll())
        .map { mapFoodReturnCategory(it) }

    fun createFoodReturnCategory(category: FoodReturnCategoryRequest): FoodReturnCategoryResponse {
        val entity = FoodReturnCategoryEntity(
            name = category.name,
            sortOrder = nextSortOrder(),
            enabled = category.enabled,
        )

        val savedEntity = foodReturnCategoryRepository.save(entity)
        log.info("Created food return category {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapFoodReturnCategory(savedEntity)
    }

    fun updateFoodReturnCategory(
        foodReturnCategoryId: Long,
        updatedCategory: FoodReturnCategoryRequest,
    ): FoodReturnCategoryResponse {
        val entity = foodReturnCategoryRepository.findByIdOrNull(foodReturnCategoryId)
            ?: throw NotFoundException("FoodReturnCategory with id $foodReturnCategoryId not found")

        entity.name = updatedCategory.name
        entity.sortOrder = updatedCategory.sortOrder
        entity.enabled = updatedCategory.enabled

        val savedEntity = foodReturnCategoryRepository.save(entity)
        log.info("Updated food return category {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapFoodReturnCategory(savedEntity)
    }

    @Transactional
    fun reorderFoodReturnCategories(categoryIds: List<Long>) {
        categoryIds.forEachIndexed { index, categoryId ->
            val entity = foodReturnCategoryRepository.findByIdOrNull(categoryId)
                ?: throw NotFoundException("FoodReturnCategory with id $categoryId not found")

            entity.sortOrder = index + 1
            foodReturnCategoryRepository.save(entity)
        }
        log.info("Reordered food return categories: {}", categoryIds)
    }

    private fun nextSortOrder(): Int = (foodReturnCategoryRepository.findAll().maxOfOrNull { it.sortOrder } ?: 0) + 1

    private fun sortCategories(categories: List<FoodReturnCategoryEntity>): List<FoodReturnCategoryEntity> = categories
        .sortedWith(
            compareBy(
                { it.sortOrder },
                { it.name },
            ),
        )

    private fun mapFoodReturnCategory(entity: FoodReturnCategoryEntity): FoodReturnCategoryResponse = FoodReturnCategoryResponse(
        id = entity.id,
        name = entity.name,
        sortOrder = entity.sortOrder,
        enabled = entity.enabled,
    )
}
