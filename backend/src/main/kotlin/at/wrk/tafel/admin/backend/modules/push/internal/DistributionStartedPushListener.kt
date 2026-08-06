package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.DistributionStartedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionStartedEvent] by pushing a "distribution started" notification to every
 * subscribed device via [PushBroadcastService].
 */
@Component
class DistributionStartedPushListener(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @EventListener
    fun onDistributionStarted(event: DistributionStartedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt!!.format(DATE_FORMATTER)

        pushBroadcastService.broadcast(
            type = PushNotificationType.DISTRIBUTION_STARTED,
            title = "Ausgabe gestartet",
            body = "Die Ausgabe vom $dateFormatted wurde gestartet.",
        )
    }
}
