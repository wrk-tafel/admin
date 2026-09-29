package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDate

@ExcludeFromTestCoverage
data class ReturnBoxesListResponse(
    val routes: List<ReturnBoxesRouteItem>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesRouteItem(
    val routeId: Long,
    val routeNumber: Double,
    val routeName: String,
    val shops: List<ReturnBoxesShop>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesShop(
    val shopId: Long,
    val shopName: String,
    val address: String,
    val boxes: List<ReturnBoxesEntry>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesEntry(
    val description: String,
    val amount: Int,
    // The day of the distribution the box was collected on - what tells "since when" it is out.
    val since: LocalDate,
    val returned: Boolean,
)

@ExcludeFromTestCoverage
data class ReturnBoxesReturnedRequest(
    val returned: Boolean,
)
