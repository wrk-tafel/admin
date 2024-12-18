package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DashboardData(
    val registeredCustomers: Int?,
    val statistics: DashboardStatisticsData?
)

@ExcludeFromTestCoverage
data class DashboardStatisticsData(
    val employeeCount: Int?,
    val personsInShelterCount: Int?,
)
