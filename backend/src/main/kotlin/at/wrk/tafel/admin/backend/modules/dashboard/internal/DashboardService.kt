package at.wrk.tafel.admin.backend.modules.dashboard.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardLastDistributionData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardLogisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardOrganizationOverviewData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardRouteProgressItem
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardStatisticsData
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardTicketsData
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
class DashboardService(
    private val distributionRepository: DistributionRepository,
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val routeRepository: RouteRepository,
    private val routeStopCompletionRepository: RouteStopCompletionRepository,
    private val householdRepository: HouseholdRepository,
    private val personRepository: PersonRepository,
    private val userRepository: UserRepository,
    private val carRepository: CarRepository,
    private val shelterRepository: ShelterRepository,
    private val shopRepository: ShopRepository,
    private val employeeRepository: EmployeeRepository,
) {

    @Transactional(readOnly = true)
    fun getData(): DashboardData {
        val currentDistribution = distributionRepository.getCurrentDistribution()

        return currentDistribution?.let {
            DashboardData(
                registeredCustomers = getRegisteredCustomers(currentDistribution),
                registeredPersons = getRegisteredPersons(currentDistribution),
                tickets = getTicketsData(currentDistribution),
                statistics = getStatisticsData(currentDistribution),
                logistics = getLogisticsData(currentDistribution),
                notes = currentDistribution.notes,
                lastDistribution = null,
                organizationOverview = null,
            )
        } ?: DashboardData(
            registeredCustomers = null,
            registeredPersons = null,
            tickets = null,
            statistics = null,
            logistics = null,
            notes = null,
            lastDistribution = getLastDistributionData(),
            organizationOverview = getOrganizationOverviewData(),
        )
    }

    private fun getOrganizationOverviewData(): DashboardOrganizationOverviewData {
        val today = LocalDate.now()
        return DashboardOrganizationOverviewData(
            activeHouseholdsCount = householdRepository.countByLockedFalseAndValidUntilGreaterThanEqual(today),
            activePersonsCount = personRepository.countActive(today),
            activeUsersCount = userRepository.countByEnabledTrue(),
            activeCarsCount = carRepository.countByEnabledIsTrue(),
            activeSheltersCount = shelterRepository.countByEnabledIsTrue(),
            activeRoutesCount = routeRepository.countByEnabledIsTrue(),
            activeShopsCount = shopRepository.countByEnabledIsTrue(),
            employeesCount = employeeRepository.count().toInt(),
        )
    }

    /**
     * A compact summary of the most recently closed distribution, shown in place of the day-specific
     * panels while none is currently open - `null` on a fresh installation where no distribution has
     * ever been closed yet.
     */
    private fun getLastDistributionData(): DashboardLastDistributionData? {
        val lastDistribution = distributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc()
            ?: return null

        val shelters = lastDistribution.statistic?.shelters ?: emptyList()

        return DashboardLastDistributionData(
            date = lastDistribution.startedAt.toLocalDate(),
            registeredCustomers = getRegisteredCustomers(lastDistribution),
            registeredPersons = getRegisteredPersons(lastDistribution),
            countProcessedTickets = countProcessedTickets(lastDistribution),
            foodAmountTotal = getFoodAmountTotal(lastDistribution),
            sheltersCount = shelters.size,
            personsInSheltersCount = shelters.sumOf { it.personsCount },
        )
    }

    private fun getTicketsData(currentDistribution: DistributionEntity): DashboardTicketsData = DashboardTicketsData(
        countProcessedTickets = countProcessedTickets(currentDistribution),
        countTotalTickets = currentDistribution.households.size,
    )

    private fun countProcessedTickets(distribution: DistributionEntity): Int = distribution.households.count { it.processed == true }

    private fun getRegisteredCustomers(currentDistribution: DistributionEntity): Int = distributionHouseholdRepository.countAllByDistributionId(currentDistribution.id!!)

    // the same formula DistributionStatisticService and the customer-list PDF use: one per
    // household (the main person) plus its additional persons that are not excluded
    private fun getRegisteredPersons(currentDistribution: DistributionEntity): Int {
        val households = currentDistribution.households
        return households.size +
            households
                .flatMap { it.household.additionalPersons() }
                .count { !it.excludeFromHousehold }
    }

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
            allRouteNames = enabledRoutes
                .sortedWith(compareBy({ it.number }, { it.name }))
                .map { it.name },
            foodAmountTotal = getFoodAmountTotal(currentDistribution),
            routeProgress = getRouteProgress(enabledRoutes),
        )
    }

    private fun getFoodAmountTotal(distribution: DistributionEntity): BigDecimal = distribution.foodCollections
        .flatMap { it.items ?: emptyList() }
        .map { it.weight }
        .sumOf { it }

    /**
     * The stop counts behind the route guidance screen, for every route that is still driven.
     * Routes without stops are left out - "0 von 0" says nothing, and a route only gets its stops
     * once someone has set them up.
     *
     * Empty until somebody has actually ticked a stop off today. The route guidance screen is
     * optional - a deployment whose drivers don't use it would otherwise get a panel of permanent
     * zeroes taking up room on a dashboard that has to fit on one screen. As soon as the first stop
     * of the day is ticked off, *every* route appears, including the ones still at zero: from then
     * on "Route 3: 0 / 15" is news rather than noise.
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
        if (completedStopIds.isEmpty()) {
            return emptyList()
        }

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
