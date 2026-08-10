package at.wrk.tafel.admin.backend.modules.logistics.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published when a route's driver has ticked off every stop but the final one - they are standing at
 * the last stop of the day and the van is about to head back. That is the moment worth announcing:
 * once the last stop is ticked off too the van is already on the road, and whoever was waiting for
 * it has had no warning.
 *
 * Published at most once per route per calendar day, guarded by `routes.last_stop_notified_date`, so
 * a driver correcting themselves at the end of the route does not announce it twice. A route with a
 * single stop never triggers it - arriving at that stop is arriving at the route's first stop, which
 * says nothing about coming back.
 *
 * [remainingStopName] is the last stop itself, so the notification can name where the van still is -
 * null for a stop that has neither a shop nor a description, which is left unnamed rather than
 * announced under a placeholder.
 */
@ExcludeFromTestCoverage
data class RouteAtLastStopEvent(
    val routeId: Long,
    val routeName: String,
    val remainingStopName: String?,
)
