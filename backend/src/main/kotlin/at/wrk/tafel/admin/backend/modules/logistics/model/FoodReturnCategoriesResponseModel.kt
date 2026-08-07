package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size

@ExcludeFromTestCoverage
data class FoodReturnCategoriesListResponse(
    val categories: List<FoodReturnCategoryResponse>,
)

@ExcludeFromTestCoverage
data class FoodReturnCategoryRequest(
    val id: Long?,
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    val sortOrder: Int,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class FoodReturnCategoryResponse(
    val id: Long?,
    val name: String,
    val sortOrder: Int,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class FoodReturnCategoryReorderRequest(
    @field:NotEmpty
    val categoryIds: List<Long>,
)
