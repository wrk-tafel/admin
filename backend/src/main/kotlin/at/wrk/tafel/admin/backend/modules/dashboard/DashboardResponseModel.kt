package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal

@ExcludeFromTestCoverage
data class DashboardData(
    val registeredCustomers: Int?,
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
    val foodAmountTotal: BigDecimal?,
)
