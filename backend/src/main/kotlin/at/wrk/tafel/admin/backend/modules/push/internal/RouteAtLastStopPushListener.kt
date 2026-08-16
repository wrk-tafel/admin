package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

/**
 * Tells the people waiting at the Tafel that a route is at its last stop and the van is on its way
 * back, so the unloading can be lined up before it pulls in.
 *
 * A listener of its own rather than another method on [DistributionPhasePushListener]: that class
 * traces the phases of one distribution day, each announced once for the whole day, while this fires
 * once per *route* and happens whether or not a distribution is running at all - a driver may work
 * through a route before the day is started.
 *
 * `@Async` for the same reason as the phase listener: the event is published from the request in
 * which a driver ticks a stop off, standing at a shop on a phone connection, and that request must
 * not wait on one HTTPS send per subscribed device.
 *
 * `@TransactionalEventListener(phase = AFTER_COMMIT)` because `RouteGuidanceService.publishIfAtLastStop`
 * publishes from inside its own transaction: a rollback there would otherwise both announce a last
 * stop that didn't stick and roll back the `markLastStopNotified` guard that stops it firing twice.
 * `fallbackExecution = true` so a caller with no open transaction (e.g. a test) still gets the
 * notification instead of it silently vanishing.
 */
@Component
class RouteAtLastStopPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onRouteAtLastStop(event: RouteAtLastStopEvent) {
        val stop = event.remainingStopName?.let { " ($it)" } ?: ""
        pushBroadcastService.broadcast(
            type = PushNotificationType.ROUTE_AT_LAST_STOP,
            title = "${event.routeName} beim letzten Stopp",
            body = "${event.routeName} ist beim letzten Stopp$stop und kommt bald zurück.",
        )
    }
}
