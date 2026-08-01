package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class RouteListResponse(
    val routes: List<RouteItem>,
)

@ExcludeFromTestCoverage
data class RouteItem(
    val id: Long,
    val name: String,
)

@ExcludeFromTestCoverage
data class RouteShopsResponse(
    val shops: List<ShopItem>,
)

@ExcludeFromTestCoverage
data class ShopItem(
    val id: Long,
    val number: Int,
    val name: String,
    val address: String,
)
