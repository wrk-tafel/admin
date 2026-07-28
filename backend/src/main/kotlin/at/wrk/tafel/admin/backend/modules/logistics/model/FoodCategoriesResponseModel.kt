package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal

@ExcludeFromTestCoverage
data class FoodCategoriesListResponse(
    val categories: List<FoodCategory>,
)

@ExcludeFromTestCoverage
data class FoodCategory(
    val id: Long?,
    val name: String,
    val weightPerUnit: BigDecimal?,
    val returnItem: Boolean,
    val sortOrder: Int,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class FoodCategoryReorderRequest(
    val categoryIds: List<Long>,
)
