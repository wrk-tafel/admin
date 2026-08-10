package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailDeliveryFailedEvent
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * Reacts to [MailDeliveryFailedEvent] by reporting a mail the outbox gave up on. Delivery happens on
 * a scheduled poller, long after the request that asked for the mail returned, so this is the only
 * thing that tells anyone the mail never arrived - the alternative is a log line and a row in
 * `mail_outbox` that nobody has a reason to look at.
 *
 * It reports the mail by its subject rather than by what produced it: the outbox deals in finished
 * MIME messages and does not know whether a given mail was a daily report or a support request,
 * and the subject is what someone would search their inbox for anyway.
 *
 * Reuses [PushNotificationType.REPORT_MAIL_FAILED] rather than introducing a type of its own - it
 * already means "a mail did not go out", is already restricted to administrators, and already opens
 * the mail settings screen, which is where a resend is triggered from. A new type would need every
 * subscriber to opt in again to keep getting what they already asked for.
 *
 * `@Async` for the same reason as [ReportMailFailedPushListener]: the poller's next mail should not
 * wait on one HTTPS send per subscribed device.
 */
@Component
class MailDeliveryFailedPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @EventListener
    fun onMailDeliveryFailed(event: MailDeliveryFailedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.REPORT_MAIL_FAILED,
            title = "E-Mail nicht versendet",
            body = "Die E-Mail '${event.subject}' konnte nicht versendet werden.",
        )
    }
}
