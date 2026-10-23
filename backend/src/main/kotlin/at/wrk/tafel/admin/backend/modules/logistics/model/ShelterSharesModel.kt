package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * The estimate of how much of the collected goods goes to the shelters picked for today's routes -
 * a rough guide for loading the van, recalculated from the current numbers on every request.
 */
@ExcludeFromTestCoverage
data class ShelterSharesResponse(
    // registered so far - registration runs all day, which is why the result is only an estimate
    val householdPersons: Int,
    val shelterPersons: Int,
    // whole boxes across every route and shelter
    val totalBoxes: Int,
    val routes: List<ShelterShareRouteItem>,
)

@ExcludeFromTestCoverage
data class ShelterShareRouteItem(
    val routeId: Long,
    val routeName: String,
    val shelters: List<ShelterShareItem>,
)

@ExcludeFromTestCoverage
data class ShelterShareItem(
    val shelterId: Long,
    val shelterName: String,
    val personsCount: Int,
    // only categories with at least one box, in the categories' own order
    val items: List<ShelterShareCategoryItem>,
)

@ExcludeFromTestCoverage
data class ShelterShareCategoryItem(
    val foodCategoryId: Long,
    val foodCategory: String,
    // whole boxes
    val boxes: Int,
)
