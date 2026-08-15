package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal

@ExcludeFromTestCoverage
data class DashboardData(
    val registeredCustomers: Int?,
    /** everyone the registered households get food for: main persons plus their not-excluded additional persons */
    val registeredPersons: Int?,
    val tickets: DashboardTicketsData?,
    val statistics: DashboardStatisticsData?,
    val logistics: DashboardLogisticsData?,
    val notes: String?,
)

@ExcludeFromTestCoverage
data class DashboardTicketsData(
    val countProcessedTickets: Int?,
    val countTotalTickets: Int?,
)

@ExcludeFromTestCoverage
data class DashboardStatisticsData(
    val employeeCount: Int?,
    val selectedShelterNames: List<String>,
)

@ExcludeFromTestCoverage
data class DashboardLogisticsData(
    val foodCollectionsRecordedCount: Int?,
    val foodCollectionsTotalCount: Int?,
    val recordedRouteNames: List<String>,
    // every route still driven today, not only the recorded ones - the dashboard renders this as
    // chips so the outstanding routes (the actionable information) are visible without diffing
    // against recordedRouteNames itself
    val allRouteNames: List<String>,
    val foodAmountTotal: BigDecimal?,
    val routeProgress: List<DashboardRouteProgressItem>,
)

/**
 * How far one route has got today, as the drivers tick their stops off in the route guidance screen
 * - the office's view of the same progress. Counted per calendar day, like the completions
 * themselves, so it says nothing about a route driven on another day.
 */
@ExcludeFromTestCoverage
data class DashboardRouteProgressItem(
    val routeId: Long,
    val routeNumber: Double,
    val routeName: String,
    val completedStops: Int,
    val totalStops: Int,
)
