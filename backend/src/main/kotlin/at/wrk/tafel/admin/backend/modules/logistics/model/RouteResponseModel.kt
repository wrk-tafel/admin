package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class RouteListResponse(
    val routes: List<Route>
)

@ExcludeFromTestCoverage
data class Route(
    val id: Long,
    val name: String,
)

@ExcludeFromTestCoverage
data class RouteShopsResponse(
    val shops: List<Shop>
)

@ExcludeFromTestCoverage
data class Shop(
    val id: Long,
    val number: Int,
    val name: String,
    val address: String
)
