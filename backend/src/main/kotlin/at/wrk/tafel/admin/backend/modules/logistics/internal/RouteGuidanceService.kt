package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterDeliveryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterDeliveryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceFixedQuantityItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceReturnItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceShelter
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceShop
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceStopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContactItem
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
    private val shelterDeliveryRepository: ShelterDeliveryRepository,
    private val shelterShareService: ShelterShareService,
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
            shelters = mapTodaysShelters(findTodaysCollection(routeId)),
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
                    completedBy = currentUser()
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

    private fun returnItemsByShopId(collection: FoodCollectionEntity?): Map<Long?, List<RouteGuidanceReturnItem>> {
        val startOfToday = LocalDate.now().atStartOfDay()
        return collection?.returnItems.orEmpty()
            // a recorded zero means "nothing came back from this shop", not an empty crate to carry;
            // a box confirmed back earlier than today has left the list, one confirmed today stays
            // (ticked off) so the confirmation can be taken back
            .filter { it.amount > 0 && (it.returnedAt == null || it.returnedAt!! >= startOfToday) }
            .groupBy({ it.shop.id }, { RouteGuidanceReturnItem(it.shop.name, it.description, it.amount, it.returnedAt != null) })
    }

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

    /**
     * The running distribution's food collection of this route - where the day's shelters are picked
     * and their deliveries recorded. Unlike the stop progress this is keyed by the distribution, not
     * the date: with no distribution running there is no day to deliver to yet.
     */
    private fun findTodaysCollection(routeId: Long): FoodCollectionEntity? = distributionRepository.getCurrentDistribution()
        ?.foodCollections
        ?.firstOrNull { it.route.id == routeId }

    private fun mapTodaysShelters(collection: FoodCollectionEntity?): List<RouteGuidanceShelter> {
        if (collection == null || collection.shelters.isEmpty()) {
            return emptyList()
        }
        val deliveriesByShelterId = shelterDeliveryRepository.findAllByFoodCollectionIdIn(listOf(collection.id!!))
            .associateBy { it.shelter.id }
        val sharesByShelterId = shelterShareService.calculate(collection.distribution).routes
            .flatMap { it.shelters }
            .associate { it.shelterId to it.items }
        return collection.shelters
            .sortedWith(compareBy({ it.sortOrder }, { it.name }))
            .map { mapShelter(it, deliveriesByShelterId[it.id]).copy(estimatedShare = sharesByShelterId[it.id].orEmpty()) }
    }

    /**
     * Confirms (or takes back) that one of the shelters picked for the route today got its goods.
     * Counted into the route's progress next to the ticked stops, but deliberately not a stop: the
     * shelters change from day to day, so they have no place in the route's fixed order.
     */
    @Transactional
    fun setShelterDelivery(routeId: Long, shelterId: Long, delivered: Boolean): RouteGuidanceShelter {
        findRoute(routeId)
        val collection = findTodaysCollection(routeId)
        val shelter = collection?.shelters?.firstOrNull { it.id == shelterId }
            ?: throw NotFoundException("Notschlafstelle $shelterId ist der Route $routeId heute nicht zugeordnet!")

        if (!delivered) {
            shelterDeliveryRepository.findByFoodCollectionIdAndShelterId(collection.id!!, shelterId)
                ?.let { shelterDeliveryRepository.delete(it) }
            return mapShelter(shelter, null).copy(estimatedShare = estimatedShare(collection, shelterId))
        }

        // see ROUTE_STOP_COMPLETION in setCompletion - the same check-then-act against a UNIQUE pair,
        // with driver and co-driver both able to confirm the same delivery at once
        val delivery = advisoryLockService.withLock(AdvisoryLockKey.SHELTER_DELIVERY) {
            // confirming twice keeps the first confirmation, whose time is the one that matters
            shelterDeliveryRepository.findByFoodCollectionIdAndShelterId(collection.id!!, shelterId)
                ?: shelterDeliveryRepository.saveAndFlush(
                    ShelterDeliveryEntity(foodCollection = collection, shelter = shelter).apply {
                        deliveredBy = currentUser()
                    },
                )
        }
        // the answer replaces this shelter on the screen, so it has to carry the estimate too
        return mapShelter(shelter, delivery).copy(estimatedShare = estimatedShare(collection, shelterId))
    }

    private fun estimatedShare(collection: FoodCollectionEntity, shelterId: Long) = shelterShareService.calculate(collection.distribution).routes
        .flatMap { it.shelters }
        .firstOrNull { it.shelterId == shelterId }
        ?.items
        .orEmpty()

    private fun categoryNames(foodCategories: Set<FoodCategoryEntity>): List<String> = foodCategories
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))
        .map { it.name }

    private fun mapShelter(shelter: ShelterEntity, delivery: ShelterDeliveryEntity?) = RouteGuidanceShelter(
        id = shelter.id!!,
        name = shelter.name,
        address = listOfNotNull(
            "${shelter.addressStreet} ${shelter.addressHouseNumber}",
            shelter.addressStairway?.let { "Stiege $it" },
            shelter.addressDoor?.let { "Top $it" },
            "${shelter.addressPostalCode} ${shelter.addressCity}",
        ).joinToString(", "),
        personsCount = shelter.personsCount,
        hasKitchen = shelter.hasKitchen,
        hasFreezer = shelter.hasFreezer,
        foodCategories = categoryNames(shelter.foodCategories),
        excludedFoodCategories = categoryNames(shelter.excludedFoodCategories),
        restrictions = shelter.restrictions,
        fixedQuantities = shelter.fixedQuantities.map {
            RouteGuidanceFixedQuantityItem(foodCategory = it.foodCategory.name, amount = it.amount, note = it.note)
        },
        contacts = shelter.contacts.map {
            ShelterContactItem(firstname = it.firstname, lastname = it.lastname, phone = it.phone)
        },
        note = shelter.note,
        delivered = delivery != null,
        deliveredAt = delivery?.createdAt,
        deliveredBy = delivery?.deliveredBy
            ?.let { listOfNotNull(it.firstname, it.lastname).joinToString(" ") }
            ?.ifBlank { null },
    )

    private fun findCompletions(stops: List<RouteStopEntity>, date: LocalDate): Map<Long?, RouteStopCompletionEntity> {
        val stopIds = stops.mapNotNull { it.id }
        if (stopIds.isEmpty()) {
            return emptyMap()
        }
        return routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(stopIds, date)
            .associateBy { it.routeStop.id }
    }

    private fun currentUser() = (SecurityContextHolder.getContext().authentication as? TafelAuthentication)
        ?.username
        ?.let { userRepository.findByUsername(it) }

    private fun mapStop(
        stop: RouteStopEntity,
        completion: RouteStopCompletionEntity?,
        returnItems: List<RouteGuidanceReturnItem>,
    ): RouteGuidanceStopItem {
        val completedBy = completion?.completedBy

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
            completedBy = listOfNotNull(completedBy?.firstname, completedBy?.lastname)
                .joinToString(" ")
                .ifBlank { null },
            returnItems = returnItems.sortedBy { it.description },
        )
    }
}
