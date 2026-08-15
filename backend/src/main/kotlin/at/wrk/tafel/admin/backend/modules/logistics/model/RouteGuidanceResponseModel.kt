package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

@ExcludeFromTestCoverage
data class RouteGuidanceResponse(
    val routeId: Long,
    val routeNumber: Double,
    val routeName: String,
    val routeNote: String?,
    val date: LocalDate,
    // The distribution the return boxes below were recorded on, null when the route has never been
    // driven or brought nothing back.
    val returnItemsFrom: LocalDate?,
    val stops: List<RouteGuidanceStopItem>,
    // Return boxes for a shop the route no longer stops at - they have nowhere to be shown along
    // the way, and dropping them would send a driver out without them.
    val unassignedReturnItems: List<RouteGuidanceReturnItem>,
)

@ExcludeFromTestCoverage
data class RouteGuidanceStopItem(
    val stopId: Long,
    val time: LocalTime,
    val description: String?,
    // Null for a stop that is not a shop visit at all, e.g. a break.
    val shop: RouteGuidanceShop?,
    val completed: Boolean,
    val completedAt: LocalDateTime?,
    val completedBy: String?,
    // What the last trip brought back from this shop and has to go with the driver now.
    val returnItems: List<RouteGuidanceReturnItem>,
)

@ExcludeFromTestCoverage
data class RouteGuidanceReturnItem(
    val shopName: String,
    val description: String,
    val amount: Int,
)

@ExcludeFromTestCoverage
data class RouteGuidanceShop(
    val id: Long,
    val number: Int,
    val name: String,
    val address: String,
    val phone: String?,
    val contactPerson: String?,
    val note: String?,
    val foodUnit: FoodUnit,
)

@ExcludeFromTestCoverage
data class RouteStopCompletionRequest(
    val completed: Boolean,
)
