package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionReturnItemEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesEntry
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesRouteItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesShop
import org.slf4j.LoggerFactory
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * The overview of return boxes that are out with the shops: per route and shop, what each box is
 * and since when, until someone confirms it went back.
 *
 * A box stays listed until it is confirmed, so one that was not taken along on a route's next trip
 * is still there the week after instead of vanishing from every list. The running distribution's
 * own collections are left out - those boxes are collected today and are only handed back on the
 * next trip, the same cut-off the route guidance uses for what a driver takes along.
 */
@Service
class ReturnBoxesService(
    private val foodCollectionRepository: FoodCollectionRepository,
    private val distributionRepository: DistributionRepository,
    private val advisoryLockService: AdvisoryLockService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(ReturnBoxesService::class.java)
    }

    @Transactional(readOnly = true)
    fun getReturnBoxes(): ReturnBoxesListResponse {
        val routes = findCollections()
            .groupBy { it.route }
            .map { (route, collections) ->
                ReturnBoxesRouteItem(
                    routeId = route.id!!,
                    routeNumber = route.number,
                    routeName = route.name,
                    shops = mapShops(collections),
                )
            }
            .filter { it.shops.isNotEmpty() }
            .sortedBy { it.routeNumber }
        return ReturnBoxesListResponse(routes)
    }

    /**
     * Confirms every outstanding box of a shop on a route as back (or, with `returned = false`,
     * takes back a confirmation from today).
     *
     * Runs under the same two locks as the return-item saves: Hibernate rewrites the whole element
     * collection on any change, so two overlapping writes to one collection would drop each
     * other's rows.
     */
    @Transactional
    fun setReturned(routeId: Long, shopId: Long, returned: Boolean): ReturnBoxesListResponse {
        advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM) {
            advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS) {
                val now = LocalDateTime.now()
                val user = currentUsername()
                var changed = 0
                findCollections().filter { it.route.id == routeId }.forEach { collection ->
                    val items = collection.returnItems.orEmpty().filter { it.shop.id == shopId }
                    val affected = items.filter { if (returned) isOutstanding(it) else isReturnedToday(it) }
                    if (affected.isNotEmpty()) {
                        affected.forEach {
                            it.returnedAt = if (returned) now else null
                            it.returnedBy = if (returned) user else null
                        }
                        changed += affected.size
                    }
                }
                logger.info(
                    "Return boxes of shop {} on route {} marked returned={} ({} entries, by {})",
                    shopId,
                    routeId,
                    returned,
                    changed,
                    user,
                )
            }
        }
        return getReturnBoxes()
    }

    private fun findCollections(): List<FoodCollectionEntity> {
        val currentDistributionId = distributionRepository.getCurrentDistribution()?.id ?: -1
        return foodCollectionRepository.findAllWithOutstandingReturnItems(
            currentDistributionId,
            LocalDate.now().atStartOfDay(),
        )
    }

    private fun mapShops(collections: List<FoodCollectionEntity>): List<ReturnBoxesShop> = collections
        .flatMap { collection ->
            val since = collection.distribution.startedAt!!.toLocalDate()
            collection.returnItems.orEmpty()
                .filter { isOutstanding(it) || isReturnedToday(it) }
                .map { Triple(it.shop, since, it) }
        }
        .groupBy { it.first }
        .map { (shop, entries) ->
            ReturnBoxesShop(
                shopId = shop.id!!,
                shopName = shop.name,
                address = shop.address.let { "${it.street}, ${it.postalCode} ${it.city}" },
                boxes = entries
                    .map { (_, since, item) ->
                        ReturnBoxesEntry(
                            description = item.description,
                            amount = item.amount,
                            since = since,
                            returned = item.returnedAt != null,
                        )
                    }
                    .sortedWith(compareBy({ it.returned }, { it.since }, { it.description })),
            )
        }
        .sortedBy { it.shopName }

    private fun isOutstanding(item: FoodCollectionReturnItemEntity) = item.returnedAt == null && item.amount > 0

    private fun isReturnedToday(item: FoodCollectionReturnItemEntity) = item.returnedAt?.let { it >= LocalDate.now().atStartOfDay() } == true

    private fun currentUsername() = (SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication)?.username
}
