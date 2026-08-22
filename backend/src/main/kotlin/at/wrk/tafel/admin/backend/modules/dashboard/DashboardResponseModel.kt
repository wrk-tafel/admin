package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class DashboardData(
    val registeredCustomers: Int?,
    /** everyone the registered households get food for: main persons plus their not-excluded additional persons */
    val registeredPersons: Int?,
    val tickets: DashboardTicketsData?,
    val statistics: DashboardStatisticsData?,
    val logistics: DashboardLogisticsData?,
    val notes: String?,
    /**
     * A snapshot of the most recently closed distribution, only ever set while no distribution is
     * currently open - the frontend shows this in place of the day-specific panels above, which
     * would otherwise all be empty. `null` both while a distribution is active and when none has
     * ever been closed yet.
     */
    val lastDistribution: DashboardLastDistributionData?,
    /**
     * Organization-wide counts, populated in the same case as [lastDistribution] - while no
     * distribution is active, so the overview page has more to show than the status card and the
     * last-distribution summary. Not refreshed by every household/user/car change (see
     * `DashboardController`'s `dashboard_update` trigger tables) - only as fresh as the last time
     * something distribution-related pushed a new snapshot, which is acceptable for a background
     * figure like this one.
     */
    val organizationOverview: DashboardOrganizationOverviewData?,
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

@ExcludeFromTestCoverage
data class DashboardLastDistributionData(
    val date: LocalDate,
    val registeredCustomers: Int,
    val registeredPersons: Int,
    val countProcessedTickets: Int,
    val foodAmountTotal: BigDecimal,
)

/**
 * Currently entitled/enabled, as opposed to a historic total - so the figures stay meaningful (a
 * household whose validity lapsed years ago isn't still a "customer", a disabled route isn't still
 * driven). The frontend shows each figure behind its own permission check (`CUSTOMER` for the two
 * household-derived ones, `USER_MANAGEMENT`, `SETTINGS` for employees, `LOGISTICS` for the rest),
 * matching the permission that figure's own screen needs - the backend sends all eight regardless,
 * same as [DashboardStatisticsData] already does for a viewer without `LOGISTICS`.
 */
@ExcludeFromTestCoverage
data class DashboardOrganizationOverviewData(
    val activeHouseholdsCount: Int,
    val activePersonsCount: Int,
    val activeUsersCount: Int,
    val activeCarsCount: Int,
    val activeSheltersCount: Int,
    val activeRoutesCount: Int,
    val activeShopsCount: Int,
    val employeesCount: Int,
)
