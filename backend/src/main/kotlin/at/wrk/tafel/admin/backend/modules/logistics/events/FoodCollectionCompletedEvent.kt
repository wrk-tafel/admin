package at.wrk.tafel.admin.backend.modules.logistics.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published once the last enabled route of the current distribution has its food collection fully
 * recorded - the point at which the goods data is complete and the distribution could be closed as
 * far as logistics is concerned. Published at most once per distribution, guarded by
 * `distributions.food_collection_completed_at`, so later corrections to an already-complete
 * recording don't announce it again.
 *
 * [routeCount] is how many routes were recorded, which is the figure worth quoting alongside it.
 */
@ExcludeFromTestCoverage
data class FoodCollectionCompletedEvent(
    val distributionId: Long,
    val routeCount: Int,
)
