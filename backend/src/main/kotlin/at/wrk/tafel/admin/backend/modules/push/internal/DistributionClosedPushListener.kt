package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] by pushing a "distribution closed" notification to every
 * subscribed device via [PushBroadcastService].
 */
@Component
class DistributionClosedPushListener(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt!!.format(DATE_FORMATTER)

        pushBroadcastService.broadcast(
            type = PushNotificationType.DISTRIBUTION_CLOSED,
            title = "Ausgabe beendet",
            body = "Die Ausgabe vom $dateFormatted wurde beendet, die Statistiken sind bereit.",
        )
    }
}
