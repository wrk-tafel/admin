package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.reporting.ReportMailFailedEvent
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import java.time.format.DateTimeFormatter

/**
 * Reacts to [ReportMailFailedEvent] by reporting a report mail that never went out. This is the one
 * failure here that is otherwise entirely invisible from inside the application: the recipients are
 * external addresses (`mail_recipients`), so nobody in the app notices the mail is missing, and the
 * people waiting for it can't tell "not sent" from "not sent yet". The notification points at the
 * mail settings screen, where the send can be triggered again.
 *
 * `@Async` because the automatic post-close path reaches this from `distribution`'s post-processing
 * and the manual resend path (`DistributionService.sendMails`) reaches it from a request thread that
 * is already waiting on mail retries - neither should additionally wait on one HTTPS send per
 * subscribed device.
 */
@Component
class ReportMailFailedPushListener(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Async
    @EventListener
    fun onReportMailFailed(event: ReportMailFailedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt.format(DATE_FORMATTER)

        pushBroadcastService.broadcast(
            type = PushNotificationType.REPORT_MAIL_FAILED,
            title = "E-Mail nicht versendet",
            body = "Die E-Mail '${event.reportName}' zur Ausgabe vom $dateFormatted konnte nicht versendet werden.",
        )
    }
}
