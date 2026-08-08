package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.events.AllTicketsProcessedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.CheckinStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.FoodHandoutStartedEvent
import at.wrk.tafel.admin.backend.modules.logistics.events.FoodCollectionCompletedEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * Turns the distribution day's phase transitions into push notifications, so that someone who isn't
 * on site can follow how the day is going without anyone having to report it. The four phases are
 * handled by one listener rather than four classes: they carry no logic beyond a title and a
 * sentence, and keeping them together is what makes the wording read as one sequence.
 *
 * Every method is `@Async` because [PushBroadcastService.broadcast] blocks on one HTTPS send per
 * subscribed device, and all four events are published from inside a request that people are
 * actively waiting on - a check-in being saved, a ticket being closed, a food collection being
 * recorded. None of those should slow down, or fail, because a push service is unreachable.
 *
 * Each event is published at most once per distribution (guarded by a phase timestamp on
 * `distributions`), so no de-duplication is needed here.
 */
@Component
class DistributionPhasePushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @EventListener
    fun onCheckinStarted(event: CheckinStartedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.CHECKIN_STARTED,
            title = "Anmeldung gestartet",
            body = "Der erste Kunde wurde angemeldet.",
        )
    }

    @Async
    @EventListener
    fun onFoodHandoutStarted(event: FoodHandoutStartedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.FOOD_HANDOUT_STARTED,
            title = "Warenausgabe gestartet",
            body = "Das erste Ticket wurde abgearbeitet, die Warenausgabe läuft.",
        )
    }

    @Async
    @EventListener
    fun onAllTicketsProcessed(event: AllTicketsProcessedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.ALL_TICKETS_PROCESSED,
            title = "Alle Kunden abgearbeitet",
            body = "Alle ${event.ticketCount} angemeldeten Kunden wurden abgearbeitet.",
        )
    }

    @Async
    @EventListener
    fun onFoodCollectionCompleted(event: FoodCollectionCompletedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.FOOD_COLLECTION_COMPLETED,
            title = "Warenerfassung abgeschlossen",
            body = "Für alle ${event.routeCount} aktiven Routen wurden die Waren erfasst.",
        )
    }
}
