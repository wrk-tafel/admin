package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertEvent
import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertReason
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * Reacts to [RetentionRunAlertEvent] by telling administrators that a retention job either failed or
 * refused to run rather than silently deleting more than its configured ceiling - GDPR gap G18. This
 * is the one failure mode of the four retention jobs that is otherwise entirely invisible: a
 * `@Scheduled` method that throws is swallowed by Spring's own scheduler logging, and a
 * ceiling-exceeded refusal looks, from the outside, identical to a quiet night.
 *
 * `@Async` for the same reason as [UserLockedOutPushListener]: the retention jobs run inside their
 * own `@Transactional` method, and nothing about a push send should make that transaction wait
 * longer on one HTTPS request per subscribed device.
 */
@Component
class RetentionRunPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @EventListener
    fun onRetentionRunAlert(event: RetentionRunAlertEvent) {
        val title = when (event.reason) {
            RetentionRunAlertReason.FAILED -> "Bereinigungsjob fehlgeschlagen"
            RetentionRunAlertReason.CEILING_EXCEEDED -> "Bereinigungsjob übersprungen"
        }

        pushBroadcastService.broadcast(
            type = PushNotificationType.RETENTION_RUN,
            title = title,
            body = "${event.jobName}: ${event.detail}",
        )
    }
}
