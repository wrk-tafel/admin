package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionStartedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionStartedEvent] by pushing a "distribution started" notification to every
 * subscribed device via [PushBroadcastService].
 *
 * `onDistributionStarted` is `@Async` because [PushBroadcastService.broadcast] does one blocking
 * HTTPS send per subscribed device (10s connect + 30s read timeout each, see [WebPushSenderService]),
 * which must not run on the thread that started the distribution: a synchronous listener would keep
 * the caller's request - and its transaction - open across that whole fan-out, and would let a push
 * service that is merely slow or unreachable fail the "Ausgabe starten" request itself. The
 * `DistributionClosedEvent` counterpart, [DistributionClosedPushListener], needs no `@Async` of its
 * own: it is already reached from `distribution`'s async post-processing chain.
 *
 * Being `@Async` on an `@EventListener` works without a self-invocation caveat here, since the
 * publisher (`DistributionService`) and this listener are different beans - Spring's proxy for this
 * bean dispatches the call to the async executor and returns immediately. Nothing awaits the result,
 * so a failure is logged by Spring's default async-uncaught-exception handler and goes no further -
 * which is what we want for a notification: the distribution has started either way.
 */
@Component
class DistributionStartedPushListener(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Async
    @EventListener
    fun onDistributionStarted(event: DistributionStartedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt.format(DATE_FORMATTER)

        pushBroadcastService.broadcast(
            type = PushNotificationType.DISTRIBUTION_STARTED,
            title = "Ausgabe gestartet",
            body = "Die Ausgabe vom $dateFormatted wurde gestartet.",
        )
    }
}
