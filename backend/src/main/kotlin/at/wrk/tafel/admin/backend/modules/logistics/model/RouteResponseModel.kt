package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import java.time.LocalTime

@ExcludeFromTestCoverage
data class RouteListResponse(
    val routes: List<RouteResponse>,
)

@ExcludeFromTestCoverage
data class RouteRequest(
    val id: Long?,
    @field:Positive
    val number: Double,
    @field:NotBlank
    val name: String,
    val note: String?,
    val enabled: Boolean,
    val stops: List<@Valid RouteStopItem>,
)

@ExcludeFromTestCoverage
data class RouteResponse(
    val id: Long?,
    val number: Double,
    val name: String,
    val note: String?,
    val enabled: Boolean,
    val stops: List<RouteStopItem>,
)

@ExcludeFromTestCoverage
data class RouteStopItem(
    val id: Long?,
    val time: LocalTime,
    val shopId: Long?,
    val description: String?,
)

@ExcludeFromTestCoverage
data class RouteShopsResponse(
    val shops: List<RouteShopItem>,
)

@ExcludeFromTestCoverage
data class RouteShopItem(
    val id: Long,
    val number: Int,
    val name: String,
    val address: String,
)
