package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterShareCategoryItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterShareItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterShareRouteItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterSharesResponse
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Estimates how much of what the routes collected goes to the shelters they deliver to today, so
 * that once the day is done the whole food is gone (issue #3882). A rough guide for loading the van,
 * not an allocation: households are served at the stations, where staff steer the goods themselves.
 *
 * Per route and food category:
 * 1. a shelter's fixed quantities come off the top, as far as that category was collected;
 * 2. the rest of every route together is shared evenly per person - every registered household
 *    person and every shelter person counts the same - and a shelter takes its share from its own
 *    route, scaled down when that route collected less than its shelters' shares add up to;
 * 3. a shelter only shares in categories it needs, never in ones it does not want, and without a
 *    known kitchen never in ones that need cooking - what it does not take stays with the households.
 *
 * Everything is in whole boxes, rounded down, so the estimate never promises more than was
 * collected; the remainders stay with the households. Never stored: it is calculated from the
 * current numbers on every request, and registration running all day is why it is only "ca.".
 */
@Service
class ShelterShareService(
    private val distributionRepository: DistributionRepository,
) {

    companion object {
        private val SCALE = 6
    }

    @Transactional(readOnly = true)
    fun getShelterShares(): ShelterSharesResponse? = distributionRepository.getCurrentDistribution()?.let { calculate(it) }

    fun calculate(distribution: DistributionEntity): ShelterSharesResponse {
        val householdPersons = distribution.countRegisteredPersons()

        // a shelter picked for more than one route is served by the first of them only, so it is
        // neither counted nor given its fixed quantities twice. Kept as a list rather than a map keyed
        // by the collection: entities compare by id, and two not-yet-saved collections would collide.
        val servedShelterIds = mutableSetOf<Long>()
        val routes = distribution.foodCollections
            .sortedWith(compareBy({ it.route.number }, { it.route.name }))
            .map { collection ->
                RouteShares(
                    collection = collection,
                    shelters = collection.shelters
                        .sortedWith(compareBy({ it.sortOrder }, { it.name }))
                        .filter { servedShelterIds.add(it.id!!) },
                    left = collectedBoxes(collection.items.orEmpty()),
                )
            }
        val shelterPersons = routes.sumOf { route -> route.shelters.sumOf { it.personsCount } }

        // 1. fixed quantities first
        routes.forEach { route ->
            route.shelters.forEach { shelter ->
                shelter.fixedQuantities.forEach { fixed ->
                    val available = route.left[fixed.foodCategory]?.setScale(0, RoundingMode.FLOOR)?.toInt() ?: 0
                    val given = minOf(fixed.amount, available)
                    if (given > 0) {
                        route.left[fixed.foodCategory] = route.left.getValue(fixed.foodCategory) - BigDecimal(given)
                        route.give(shelter, fixed.foodCategory, given)
                    }
                }
            }
        }

        // 2. the rest evenly per person, each shelter from its own route
        val persons = householdPersons + shelterPersons
        if (persons > 0) {
            val totalLeftPerCategory = mutableMapOf<FoodCategoryEntity, BigDecimal>()
            routes.forEach { route -> route.left.forEach { (category, boxes) -> totalLeftPerCategory.merge(category, boxes, BigDecimal::add) } }

            routes.forEach { route ->
                route.left.forEach { (category, left) ->
                    val perPerson = totalLeftPerCategory.getValue(category).divide(BigDecimal(persons), SCALE, RoundingMode.FLOOR)
                    val takers = route.shelters.filter { takes(it, category) }
                    val wanted = takers.sumOf { BigDecimal(it.personsCount) * perPerson }
                    if (wanted.signum() == 0) {
                        return@forEach
                    }
                    // the route's own goods are all its shelters can get
                    val factor = if (wanted > left) left.divide(wanted, SCALE, RoundingMode.FLOOR) else BigDecimal.ONE
                    takers.forEach { shelter ->
                        val boxes = (BigDecimal(shelter.personsCount) * perPerson * factor).setScale(0, RoundingMode.FLOOR).toInt()
                        if (boxes > 0) {
                            route.give(shelter, category, boxes)
                        }
                    }
                }
            }
        }

        val routeItems = routes
            .filter { it.shelters.isNotEmpty() }
            .map { route ->
                ShelterShareRouteItem(
                    routeId = route.collection.route.id!!,
                    routeName = route.collection.route.name,
                    shelters = route.shelters.map { shelter ->
                        ShelterShareItem(
                            shelterId = shelter.id!!,
                            shelterName = shelter.name,
                            personsCount = shelter.personsCount,
                            items = route.given[shelter.id].orEmpty()
                                .entries
                                .sortedWith(compareBy({ it.key.sortOrder }, { it.key.name }))
                                .map { (category, boxes) ->
                                    ShelterShareCategoryItem(foodCategoryId = category.id!!, foodCategory = category.name, boxes = boxes)
                                },
                        )
                    },
                )
            }

        return ShelterSharesResponse(
            householdPersons = householdPersons,
            shelterPersons = shelterPersons,
            totalBoxes = routeItems.sumOf { route -> route.shelters.sumOf { shelter -> shelter.items.sumOf { it.boxes } } },
            routes = routeItems,
        )
    }

    /**
     * What a route collected per category, in boxes. A shop counted in kilograms is turned into boxes
     * through the category's weight per box; a category without one has no box to count it in.
     */
    private fun collectedBoxes(items: List<FoodCollectionItemEntity>): MutableMap<FoodCategoryEntity, BigDecimal> {
        val boxes = mutableMapOf<FoodCategoryEntity, BigDecimal>()
        items.forEach { item ->
            val itemBoxes = when (item.shop.foodUnit) {
                FoodUnit.BOX -> BigDecimal(item.amount)
                FoodUnit.KG ->
                    item.category.weightPerUnit
                        ?.takeIf { it.signum() > 0 }
                        ?.let { BigDecimal(item.amount).divide(it, SCALE, RoundingMode.FLOOR) }
                        ?: BigDecimal.ZERO
            }
            if (itemBoxes.signum() > 0) {
                boxes.merge(item.category, itemBoxes, BigDecimal::add)
            }
        }
        return boxes
    }

    private fun takes(shelter: ShelterEntity, category: FoodCategoryEntity): Boolean = category in shelter.foodCategories &&
        category !in shelter.excludedFoodCategories &&
        !(category.needsCooking && shelter.hasKitchen != true)
}

/** One route's part of the calculation: its shelters, what it still has left, and what it gave. */
private class RouteShares(
    val collection: FoodCollectionEntity,
    val shelters: List<ShelterEntity>,
    val left: MutableMap<FoodCategoryEntity, BigDecimal>,
) {
    val given = mutableMapOf<Long, MutableMap<FoodCategoryEntity, Int>>()

    fun give(shelter: ShelterEntity, category: FoodCategoryEntity, boxes: Int) {
        given.getOrPut(shelter.id!!) { mutableMapOf() }.merge(category, boxes, Int::plus)
    }
}
