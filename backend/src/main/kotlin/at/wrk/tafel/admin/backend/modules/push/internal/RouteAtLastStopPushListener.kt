package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

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
 */
@Component
class RouteAtLastStopPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @EventListener
    fun onRouteAtLastStop(event: RouteAtLastStopEvent) {
        val stop = event.remainingStopName?.let { " ($it)" } ?: ""
        pushBroadcastService.broadcast(
            type = PushNotificationType.ROUTE_AT_LAST_STOP,
            title = "${event.routeName} beim letzten Stopp",
            body = "${event.routeName} ist beim letzten Stopp$stop und kommt bald zurück.",
        )
    }
}
