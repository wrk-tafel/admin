package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceReturnItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceShop
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceStopItem
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * Read model for the route guidance screen: the stops of a route in driving order, the return boxes
 * the last trip left behind, and the per-day progress a driver ticks off along the way.
 *
 * Progress is keyed by the calendar date the server is on, never by a distribution: the screen is
 * reachable without an active distribution on purpose, so a driver can look at the route before the
 * day starts. The date is taken here rather than accepted from the client, so a device with a wrong
 * clock cannot tick off a different day.
 */
@Service
class RouteGuidanceService(
    private val routeRepository: RouteRepository,
    private val routeStopCompletionRepository: RouteStopCompletionRepository,
    private val foodCollectionRepository: FoodCollectionRepository,
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
) {

    @Transactional(readOnly = true)
    fun getGuidance(routeId: Long): RouteGuidanceResponse {
        val route = findRoute(routeId)
        val date = LocalDate.now()
        val stops = route.stops.sortedBy { it.time }
        val completionsByStopId = findCompletions(stops, date)

        val previousCollection = findPreviousCollection(routeId)
        val returnItemsByShopId = returnItemsByShopId(previousCollection)
        val stopShopIds = stops.mapNotNull { it.shop?.id }.toSet()

        return RouteGuidanceResponse(
            routeId = route.id!!,
            routeNumber = route.number,
            routeName = route.name,
            routeNote = route.note,
            date = date,
            returnItemsFrom = previousCollection
                ?.takeIf { returnItemsByShopId.isNotEmpty() }
                ?.distribution
                ?.startedAt
                ?.toLocalDate(),
            stops = stops.map {
                mapStop(it, completionsByStopId[it.id], returnItemsByShopId[it.shop?.id].orEmpty())
            },
            unassignedReturnItems = returnItemsByShopId
                .filterKeys { it !in stopShopIds }
                .values
                .flatten()
                .sortedWith(compareBy({ it.shopName }, { it.description })),
        )
    }

    @Transactional
    fun setCompletion(routeId: Long, stopId: Long, completed: Boolean): RouteGuidanceStopItem {
        val route = findRoute(routeId)
        val stop = route.stops.firstOrNull { it.id == stopId }
            ?: throw NotFoundException("Stopp $stopId gehört nicht zur Route $routeId!")
        val date = LocalDate.now()

        // The answer replaces this stop in the screen's list, so it has to carry the return boxes
        // too - ticking a stop off must not make them disappear from under the driver.
        val returnItems = returnItemsByShopId(findPreviousCollection(routeId))[stop.shop?.id].orEmpty()

        val existingCompletion = routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(stopId, date)
        if (!completed) {
            if (existingCompletion != null) {
                routeStopCompletionRepository.deleteByRouteStopIdAndCompletionDate(stopId, date)
            }
            return mapStop(stop, null, returnItems)
        }

        // Ticking an already ticked stop keeps the original completion instead of restamping it -
        // the timestamp is what tells a second driver when the stop was actually done.
        // saveAndFlush, not save: @CreationTimestamp is assigned when the insert is written, so a
        // plain save() would return an entity whose createdAt is still null and the response would
        // carry no completion time until the next read.
        val completion = existingCompletion ?: routeStopCompletionRepository.saveAndFlush(
            RouteStopCompletionEntity(routeStop = stop, completionDate = date).apply {
                employee = currentEmployee()
            },
        )
        return mapStop(stop, completion, returnItems)
    }

    private fun returnItemsByShopId(collection: FoodCollectionEntity?): Map<Long?, List<RouteGuidanceReturnItem>> = collection?.returnItems.orEmpty()
        // a recorded zero means "nothing came back from this shop", not an empty crate to carry
        .filter { it.amount > 0 }
        .groupBy({ it.shop.id }, { RouteGuidanceReturnItem(it.shop.name, it.description, it.amount) })

    private fun findRoute(routeId: Long): RouteEntity = routeRepository.findByIdOrNull(routeId)
        ?: throw NotFoundException("Route $routeId nicht gefunden!")

    /**
     * The trip whose return boxes are still waiting to go back: the route's newest food collection
     * that does not belong to the distribution currently running (see the repository method's KDoc).
     */
    private fun findPreviousCollection(routeId: Long): FoodCollectionEntity? {
        val currentDistributionId = distributionRepository.getCurrentDistribution()?.id ?: -1
        return foodCollectionRepository
            .findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc(routeId, currentDistributionId)
    }

    private fun findCompletions(stops: List<RouteStopEntity>, date: LocalDate): Map<Long?, RouteStopCompletionEntity> {
        val stopIds = stops.mapNotNull { it.id }
        if (stopIds.isEmpty()) {
            return emptyMap()
        }
        return routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(stopIds, date)
            .associateBy { it.routeStop.id }
    }

    private fun currentEmployee() = (SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication)
        ?.username
        ?.let { userRepository.findByUsername(it) }
        ?.employee

    private fun mapStop(
        stop: RouteStopEntity,
        completion: RouteStopCompletionEntity?,
        returnItems: List<RouteGuidanceReturnItem>,
    ): RouteGuidanceStopItem {
        val employee = completion?.employee

        return RouteGuidanceStopItem(
            stopId = stop.id!!,
            time = stop.time,
            description = stop.description,
            // Unlike ShopService.getShopsForRouteId, a disabled shop is kept here: a driver is sent
            // to every stop the route still holds, and dropping one silently would leave a gap.
            shop = stop.shop?.let { shop ->
                RouteGuidanceShop(
                    id = shop.id!!,
                    number = shop.number,
                    name = shop.name,
                    address = shop.address.let { "${it.street}, ${it.postalCode} ${it.city}" },
                    phone = shop.phone,
                    contactPerson = shop.contactPerson,
                    note = shop.note,
                    foodUnit = shop.foodUnit,
                    enabled = shop.enabled,
                )
            },
            completed = completion != null,
            completedAt = completion?.createdAt,
            completedBy = listOfNotNull(employee?.firstname, employee?.lastname)
                .joinToString(" ")
                .ifBlank { null },
            returnItems = returnItems.sortedBy { it.description },
        )
    }
}
