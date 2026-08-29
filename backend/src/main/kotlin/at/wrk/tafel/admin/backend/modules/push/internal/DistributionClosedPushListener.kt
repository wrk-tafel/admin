package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] by pushing a "distribution closed" notification to every
 * subscribed device via [PushBroadcastService]. Ignores an event with [DistributionClosedEvent.resend]
 * set - a manual mail resend (`DistributionService.sendMails`) re-publishes the same event type to
 * drive `reporting`'s mail listener, and re-broadcasting "the distribution has ended" to every device
 * days after it actually did would be wrong.
 *
 * `onDistributionClosed` is `@Async`: unlike the automatic post-close path (already reached from
 * `distribution`'s own async chain), the manual resend calls [PushBroadcastService.broadcast] - one
 * blocking HTTPS send per subscribed device - synchronously from the request thread. Without `@Async`
 * here, a resend would block the "send-mails" request for the whole fan-out on top of the mails
 * themselves. See [DistributionStartedPushListener] for the same reasoning in more detail.
 */
@Component
class DistributionClosedPushListener(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Async
    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        if (event.resend) {
            return
        }

        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt.format(DATE_FORMATTER)

        pushBroadcastService.broadcast(
            type = PushNotificationType.DISTRIBUTION_CLOSED,
            title = "Ausgabe beendet",
            body = "Die Ausgabe vom $dateFormatted wurde beendet, die Statistiken sind bereit.",
        )
    }
}
