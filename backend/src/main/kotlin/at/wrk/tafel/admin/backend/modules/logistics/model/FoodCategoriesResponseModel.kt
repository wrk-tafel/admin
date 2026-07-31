package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.PositiveOrZero
import java.math.BigDecimal

@ExcludeFromTestCoverage
data class FoodCategoriesListResponse(
    val categories: List<FoodCategory>,
)

@ExcludeFromTestCoverage
data class FoodCategory(
    val id: Long?,
    @field:NotBlank
    val name: String,
    @field:PositiveOrZero
    val weightPerUnit: BigDecimal?,
    val returnItem: Boolean,
    val sortOrder: Int,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class FoodCategoryReorderRequest(
    @field:NotEmpty
    val categoryIds: List<Long>,
)
