package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCategoriesService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCategoriesListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/food-categories")
class FoodCategoriesController(
    private val foodCategoriesService: FoodCategoriesService
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getFoodCategories(): FoodCategoriesListResponse {
        val categories = foodCategoriesService.getFoodCategories()
        return FoodCategoriesListResponse(categories = categories)
    }

}
