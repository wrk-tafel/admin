package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
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
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceReturnItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceShop
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceStopItem
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
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
    private val eventPublisher: ApplicationEventPublisher,
    private val advisoryLockService: AdvisoryLockService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(RouteGuidanceService::class.java)
    }

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

        if (!completed) {
            if (routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(stopId, date) != null) {
                routeStopCompletionRepository.deleteByRouteStopIdAndCompletionDate(stopId, date)
            }
            return mapStop(stop, null, returnItems)
        }

        // Wrapped in AdvisoryLockKey.ROUTE_STOP_COMPLETION because the find-then-insert below is a
        // check-then-act against `(route_stop_id, completion_date)`'s UNIQUE constraint: a driver
        // and co-driver both ticking off the same stop at once (the screen is explicitly designed
        // for two people on one van) would otherwise both find nothing and both insert, and the
        // loser would get a duplicate-key 500 instead of the completion the other one just recorded.
        val completion = advisoryLockService.withLock(AdvisoryLockKey.ROUTE_STOP_COMPLETION) {
            val existingCompletion = routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(stopId, date)

            // Ticking an already ticked stop keeps the original completion instead of restamping it -
            // the timestamp is what tells a second driver when the stop was actually done.
            // saveAndFlush, not save: @CreationTimestamp is assigned when the insert is written, so a
            // plain save() would return an entity whose createdAt is still null and the response would
            // carry no completion time until the next read.
            existingCompletion ?: routeStopCompletionRepository.saveAndFlush(
                RouteStopCompletionEntity(routeStop = stop, completionDate = date).apply {
                    employee = currentEmployee()
                },
            )
        }
        publishIfAtLastStop(route, date)
        return mapStop(stop, completion, returnItems)
    }

    /**
     * Announces that the driver has arrived at the route's final stop - see [RouteAtLastStopEvent]
     * for why that moment and not the one after it.
     *
     * The completions are re-read rather than derived from what the caller just wrote: the tick that
     * completes the picture can be any of the route's stops, not only the second-to-last one, since
     * a driver may go back and catch up a stop they skipped. `markLastStopNotified` is what makes
     * this happen once a day; everything above it is only the question of whether to ask.
     */
    private fun publishIfAtLastStop(route: RouteEntity, date: LocalDate) {
        val stops = route.stops.sortedBy { it.time }
        // a one-stop route's only stop is also its first - arriving there says nothing about
        // heading back
        if (stops.size < 2) {
            return
        }

        val completedStopIds = findCompletions(stops, date).keys
        val lastStop = stops.last()
        if (lastStop.id in completedStopIds || !stops.dropLast(1).all { it.id in completedStopIds }) {
            return
        }

        if (routeRepository.markLastStopNotified(route.id!!, date) == 1) {
            logger.info("Route {} reached its last stop on {}", route.id, date)
            eventPublisher.publishEvent(
                RouteAtLastStopEvent(
                    routeId = route.id!!,
                    routeName = route.name,
                    remainingStopName = lastStop.shop?.name ?: lastStop.description,
                ),
            )
        }
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
