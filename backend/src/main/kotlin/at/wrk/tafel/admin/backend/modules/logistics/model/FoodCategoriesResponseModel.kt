package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class FoodCategoriesListResponse(
    val categories: List<FoodCategory>
)

@ExcludeFromTestCoverage
data class FoodCategory(
    val id: Long,
    val name: String,
    val returnItem: Boolean
)
