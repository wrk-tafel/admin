package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCategoryService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoriesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategory
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoryReorderRequest
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/food-categories")
class FoodCategoriesController(
    private val foodCategoriesService: FoodCategoryService,
) {

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getActiveFoodCategories(): FoodCategoriesListResponse {
        val categories = foodCategoriesService.getActiveFoodCategories()
        return FoodCategoriesListResponse(categories = categories)
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun getAllFoodCategories(): FoodCategoriesListResponse {
        val categories = foodCategoriesService.getAllFoodCategories()
        return FoodCategoriesListResponse(categories = categories)
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createFoodCategory(
        @RequestBody category: FoodCategory,
    ): FoodCategory = foodCategoriesService.createFoodCategory(category)

    @PostMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateFoodCategory(
        @PathVariable categoryId: Long,
        @RequestBody category: FoodCategory,
    ): FoodCategory = foodCategoriesService.updateFoodCategory(categoryId, category)

    @PostMapping("/reorder")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun reorderFoodCategories(
        @RequestBody request: FoodCategoryReorderRequest,
    ): FoodCategoriesListResponse {
        foodCategoriesService.reorderFoodCategories(request.categoryIds)
        return FoodCategoriesListResponse(categories = foodCategoriesService.getAllFoodCategories())
    }
}
