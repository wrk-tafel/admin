package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] by reporting any enabled route whose food collection was never
 * fully recorded. Nothing blocks closing a distribution with recording still outstanding, and the
 * numbers only turn up as gaps in the statistics afterwards - by which point the people who drove
 * the route have long gone home and the data is a reconstruction rather than a record.
 *
 * Silent when everything was recorded: this notification exists to report an exception, and one that
 * also arrives on the (normal) good case would train everyone to swipe it away unread.
 *
 * `@Transactional(readOnly = true)` because `distribution.foodCollections` is lazy and the
 * repository's own transaction is already closed by the time it is read - the same reason
 * `reporting`'s listener on this event carries it. `@Async` on top, unlike [DistributionClosedPushListener]:
 * this event is also published by a manual mail resend (`DistributionService.sendMails`) straight
 * from a request thread, and the blocking per-device HTTPS sends [PushBroadcastService] does must
 * not run inside that request.
 */
@Component
class FoodCollectionIncompletePushListener(
    private val distributionRepository: DistributionRepository,
    private val routeRepository: RouteRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Async
    @EventListener
    @Transactional(readOnly = true)
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return

        val recordedRouteIds = distribution.foodCollections
            .filter { it.isFullyRecorded() }
            .mapNotNull { it.route.id }
            .toSet()

        // Disabled routes aren't driven anymore, so a missing recording for one of them isn't a gap.
        val missingRoutes = routeRepository.findByEnabledIsTrue()
            .filter { it.id !in recordedRouteIds }
            .sortedWith(compareBy({ it.number }, { it.name }))

        if (missingRoutes.isEmpty()) {
            return
        }

        val dateFormatted = distribution.startedAt.format(DATE_FORMATTER)
        val routeNames = missingRoutes.joinToString(", ") { it.name }

        pushBroadcastService.broadcast(
            type = PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
            title = "Warenerfassung unvollständig",
            body = "Bei der Ausgabe vom $dateFormatted fehlt die Warenerfassung für: $routeNames.",
        )
    }
}
