package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Reminds about a distribution that was started but never closed.
 *
 * Closing is entirely manual (`DistributionService.closeDistribution`) and nothing else ever notices
 * that it didn't happen, which makes this the one notification type here with no event behind it -
 * the thing worth reporting is precisely that no event occurred. A forgotten-open distribution is
 * not merely untidy: every `@TafelActiveDistributionRequired` endpoint keeps behaving as if a
 * distribution were running, and the statistics, cost contributions and report mails that close
 * produces are all still pending.
 *
 * Fires only once a day and only for a distribution started on an *earlier* day, so the long
 * Saturday distribution itself is never nagged about while it is legitimately still running. It
 * repeats each morning until someone actually closes it, which is the intent - a single reminder
 * that arrives while nobody is looking would be worth little.
 *
 * Assumes one application instance per environment, as every other `@Scheduled` job here does; on
 * several instances each would send its own copy of this reminder, since a notification (unlike
 * those jobs' idempotent cleanup work) is not something a second run can repeat harmlessly.
 */
@Component
class DistributionStillOpenReminderService(
    private val distributionRepository: DistributionRepository,
    private val pushBroadcastService: PushBroadcastService,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionStillOpenReminderService::class.java)
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Scheduled(cron = "0 0 8 * * *")
    fun remindAboutStillOpenDistribution() {
        val distribution = distributionRepository.getCurrentDistribution() ?: return

        val startedOn = distribution.startedAt.toLocalDate()
        if (!startedOn.isBefore(LocalDate.now(clock))) {
            return
        }

        val dateFormatted = distribution.startedAt.format(DATE_FORMATTER)
        logger.warn("Distribution from $dateFormatted is still open - notifying subscribed devices")

        pushBroadcastService.broadcast(
            type = PushNotificationType.DISTRIBUTION_STILL_OPEN,
            title = "Ausgabe noch offen",
            body = "Die Ausgabe vom $dateFormatted wurde noch nicht beendet.",
        )
    }
}
