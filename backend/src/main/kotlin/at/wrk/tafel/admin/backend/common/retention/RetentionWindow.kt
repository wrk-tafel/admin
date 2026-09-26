package at.wrk.tafel.admin.backend.common.retention

import java.time.LocalDateTime
import java.time.Period

/**
 * The moment before which something counts as due for a retention job or about to be, shared by
 * everything that has to agree on it: the advance warning to administrators
 * (`RetentionExpiryReminderService`) and the screen listing what is pending (`PendingDeletionsService`).
 * The retention jobs themselves cut off at `now - retentionTime` (see e.g. `UserRetentionService`);
 * this is the same cutoff moved forward by the job's `retentionWarning`.
 */
object RetentionWindow {

    /**
     * Everything measured before the returned moment is within the warning window of the job -
     * `now - retention + warning`, never later than [now] - or `null` when the job is switched off
     * ([enabled] false, or a [retention] time that is zero or negative). A negative [warning] counts
     * as none: only what is already due.
     */
    fun warnCutoff(enabled: Boolean, retention: Period, warning: Period, now: LocalDateTime): LocalDateTime? {
        if (!enabled || retention.isZero || retention.isNegative) {
            return null
        }
        val effectiveWarning = if (warning.isNegative) Period.ZERO else warning
        return now.minus(retention).plus(effectiveWarning).coerceAtMost(now)
    }
}
