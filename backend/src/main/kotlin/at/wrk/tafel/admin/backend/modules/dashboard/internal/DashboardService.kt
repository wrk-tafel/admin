package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardLogisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardRouteProgressItem
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardStatisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardTicketsData
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val routeRepository: RouteRepository,
    private val routeStopCompletionRepository: RouteStopCompletionRepository,
) {

    @Transactional(readOnly = true)
    fun getData(): DashboardData {
        val currentDistribution = distributionRepository.getCurrentDistribution()

        return currentDistribution?.let {
            DashboardData(
                registeredCustomers = getRegisteredCustomers(currentDistribution),
                tickets = getTicketsData(currentDistribution),
                statistics = getStatisticsData(currentDistribution),
                logistics = getLogisticsData(currentDistribution),
                notes = currentDistribution.notes,
            )
        } ?: DashboardData(
            registeredCustomers = null,
            tickets = null,
            statistics = null,
            logistics = null,
            notes = null,
        )
    }

    private fun getTicketsData(currentDistribution: DistributionEntity): DashboardTicketsData {
        val countProcessedTickets = currentDistribution.households.count { it.processed == true }
        val countTotalTickets = currentDistribution.households.size

        return DashboardTicketsData(
            countProcessedTickets = countProcessedTickets,
            countTotalTickets = countTotalTickets,
        )
    }

    private fun getRegisteredCustomers(currentDistribution: DistributionEntity): Int = distributionHouseholdRepository.countAllByDistributionId(currentDistribution.id!!)

    private fun getStatisticsData(currentDistribution: DistributionEntity?): DashboardStatisticsData = DashboardStatisticsData(
        employeeCount = currentDistribution?.statistic?.employeeCount.takeIf { it != 0 },
        // Intentionally names, not shelter ids: statistics keep a historic copy independent of later shelter renames/deletions
        selectedShelterNames = currentDistribution?.statistic?.shelters
            ?.sortedWith(compareBy({ it.sortOrder }, { it.name }))
            ?.map { it.name } ?: emptyList(),
    )

    private fun getLogisticsData(currentDistribution: DistributionEntity): DashboardLogisticsData {
        val doneFoodCollections = currentDistribution.foodCollections.filter { it.isFullyRecorded() }
        // disabled routes aren't driven anymore, so they must not inflate the target count
        val enabledRoutes = routeRepository.findByEnabledIsTrue()

        return DashboardLogisticsData(
            foodCollectionsRecordedCount = doneFoodCollections.size,
            foodCollectionsTotalCount = enabledRoutes.size,
            recordedRouteNames = doneFoodCollections
                .sortedWith(compareBy({ it.route.number }, { it.route.name }))
                .map { it.route.name },
            foodAmountTotal = currentDistribution.foodCollections
                .flatMap { it.items ?: emptyList() }
                .map { it.weight }
                .sumOf { it },
            routeProgress = getRouteProgress(enabledRoutes),
        )
    }

    /**
     * The stop counts behind the route guidance screen, for every route that is still driven.
     * Routes without stops are left out - "0 von 0" says nothing, and a route only gets its stops
     * once someone has set them up.
     */
    private fun getRouteProgress(enabledRoutes: List<RouteEntity>): List<DashboardRouteProgressItem> {
        val routesWithStops = enabledRoutes.filter { it.stops.isNotEmpty() }
        val stopIds = routesWithStops.flatMap { route -> route.stops.mapNotNull { it.id } }
        if (stopIds.isEmpty()) {
            return emptyList()
        }

        // one query for every route's stops rather than one per route
        val completedStopIds = routeStopCompletionRepository
            .findAllByRouteStopIdInAndCompletionDate(stopIds, LocalDate.now())
            .mapNotNull { it.routeStop.id }
            .toSet()

        return routesWithStops
            .sortedWith(compareBy({ it.number }, { it.name }))
            .map { route ->
                DashboardRouteProgressItem(
                    routeId = route.id!!,
                    routeNumber = route.number,
                    routeName = route.name,
                    completedStops = route.stops.count { it.id in completedStopIds },
                    totalStops = route.stops.size,
                )
            }
    }
}
