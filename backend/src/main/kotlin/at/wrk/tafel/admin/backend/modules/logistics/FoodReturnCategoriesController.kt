package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodReturnCategoryService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoriesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryReorderRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodReturnCategoryResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/food-return-categories")
class FoodReturnCategoriesController(
    private val foodReturnCategoryService: FoodReturnCategoryService,
) {

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getActiveFoodReturnCategories(): FoodReturnCategoriesListResponse {
        val categories = foodReturnCategoryService.getActiveFoodReturnCategories()
        return FoodReturnCategoriesListResponse(categories = categories)
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun getAllFoodReturnCategories(): FoodReturnCategoriesListResponse {
        val categories = foodReturnCategoryService.getAllFoodReturnCategories()
        return FoodReturnCategoriesListResponse(categories = categories)
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createFoodReturnCategory(
        @Valid @RequestBody category: FoodReturnCategoryRequest,
    ): ResponseEntity<FoodReturnCategoryResponse> = ResponseEntity.status(HttpStatus.CREATED)
        .body(foodReturnCategoryService.createFoodReturnCategory(category))

    @PutMapping("/{foodReturnCategoryId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateFoodReturnCategory(
        @PathVariable foodReturnCategoryId: Long,
        @Valid @RequestBody category: FoodReturnCategoryRequest,
    ): FoodReturnCategoryResponse = foodReturnCategoryService.updateFoodReturnCategory(foodReturnCategoryId, category)

    @PostMapping("/reorder")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun reorderFoodReturnCategories(
        @Valid @RequestBody request: FoodReturnCategoryReorderRequest,
    ): FoodReturnCategoriesListResponse {
        foodReturnCategoryService.reorderFoodReturnCategories(request.categoryIds)
        return FoodReturnCategoriesListResponse(categories = foodReturnCategoryService.getAllFoodReturnCategories())
    }
}
