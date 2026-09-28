package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime

/**
 * Asks staff to review household locks that have no `lockedUntil` date (issue #3763, GDPR
 * Art. 5(1)(e)): such a lock never lifts itself, and one for `BANNED_FROM_PREMISES` also keeps the
 * record out of `HouseholdRetentionService`, so nothing else would ever ask whether it still applies.
 * A lock is due once its last review - or, never reviewed, the lock itself - is older than
 * `tafeladmin.householdLockReview.interval`.
 *
 * Reads the repository and the config directly, like [RetentionExpiryReminderService], rather than
 * `household`'s `HouseholdLockReviewService` - so this module gains no dependency on that one,
 * matching its own package-info's "this module only ever listens". Runs weekly rather than daily and
 * keeps repeating until the locks are reviewed or lifted: a review is a decision to make, not a
 * deadline that passes, so a daily nag would be noise.
 */
@Component
class HouseholdLockReviewReminderService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val householdRepository: HouseholdRepository,
    private val pushBroadcastService: PushBroadcastService,
    private val clock: Clock,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(HouseholdLockReviewReminderService::class.java)
    }

    /**
     * Sent once per cluster, not once per instance, for the same reason as
     * [ScannerFileExpiryReminderService]. The schedule is a plain placeholder rather than a
     * `TafelAdminProperties` field: `@Scheduled` fixes its expression when the bean is created.
     */
    @Scheduled(cron = "\${tafeladmin.householdLockReview.cron:0 10 8 * * MON}")
    @SchedulerLock(name = "householdLockReviewReminder", lockAtMostFor = "PT1H", lockAtLeastFor = "PT1H")
    fun remindAboutLocksDueForReview() {
        val review = tafelAdminProperties.householdLockReview
        if (!review.enabled || review.interval.isZero || review.interval.isNegative) {
            return
        }

        val dueCount = householdRepository.countLockReviewsDue(LocalDateTime.now(clock).minus(review.interval))
        if (dueCount == 0L) {
            return
        }

        logger.info("{} household lock(s) due for review - notifying subscribed devices", dueCount)

        pushBroadcastService.broadcast(
            type = PushNotificationType.HOUSEHOLD_LOCK_REVIEW_DUE,
            title = "Sperren überprüfen",
            body = "$dueCount Kunden sind ohne Enddatum gesperrt und warten auf eine Überprüfung.",
        )
    }
}
