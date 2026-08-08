package at.wrk.tafel.admin.backend.modules.distribution.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * The points during a distribution day at which it visibly moves from one phase to the next.
 * Unlike [DistributionStartedEvent]/[DistributionClosedEvent], which mark someone pressing a button,
 * these are reached implicitly by people simply doing their work - which is exactly why they are
 * worth announcing: nobody is in a position to tell the rest of the team that the day has moved on.
 *
 * Each is published at most once per distribution, guarded by its phase timestamp on
 * `distributions` (see `DistributionRepository.mark*`), so reopening a ticket or deleting and
 * re-entering a check-in cannot produce a second one.
 */
@ExcludeFromTestCoverage
data class CheckinStartedEvent(
    val distributionId: Long,
)

/**
 * Published when the first ticket has been *processed*, not when one was first displayed: the
 * ticket-screen control page issues `show-current` as it loads, so a ticket is on the screen from
 * the moment someone opens that page - potentially long before the monitor is even switched on. A
 * processed ticket is the earliest point at which food has demonstrably reached somebody.
 *
 * Unrelated to the "Startzeit" the desk can publish to the ticket monitor: that is an announcement
 * to waiting customers of when hand-out is *meant* to begin, and the two routinely differ.
 */
@ExcludeFromTestCoverage
data class FoodHandoutStartedEvent(
    val distributionId: Long,
)

/**
 * [ticketCount] is how many households were served in total - the number worth quoting once there is
 * nothing left to process.
 */
@ExcludeFromTestCoverage
data class AllTicketsProcessedEvent(
    val distributionId: Long,
    val ticketCount: Int,
)
