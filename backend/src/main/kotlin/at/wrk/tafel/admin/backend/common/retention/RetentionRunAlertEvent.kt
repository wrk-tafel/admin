package at.wrk.tafel.admin.backend.common.retention

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published by a retention job (`HouseholdRetentionService`, `UserRetentionService`,
 * `EmployeeRetentionService`, `AuditRetentionService`) when a run is worth an administrator's
 * attention rather than only a log line - GDPR gap G19 (`docs/architecture/gdpr-compliance.md`).
 * `push`'s `RetentionRunPushListener` is the one and only subscriber, turning this into a
 * `RETENTION_RUN` broadcast; kept here rather than in `modules.push` since every publisher would
 * otherwise need a dependency on a module whose own `package-info.java` states it is never depended
 * on by anything (same reasoning as `common.auth.model.UserLockedOutEvent`).
 *
 * Deliberately *not* published for an ordinary successful run - only [reason] below, both of which
 * are the two ways a night's cleanup stops being routine: the job threw, or it would have deleted
 * more rows than [ceiling] allows and refused rather than proceeding.
 */
@ExcludeFromTestCoverage
data class RetentionRunAlertEvent(
    val jobName: String,
    val reason: RetentionRunAlertReason,
    val detail: String,
)

@ExcludeFromTestCoverage
enum class RetentionRunAlertReason {
    /** The job threw before it could finish; nothing it hadn't already committed was deleted. */
    FAILED,

    /**
     * The job found more candidates than its configured ceiling allows and deleted none of them
     * this run, rather than proceeding - a misconfigured retention window looks identical to a
     * normal night otherwise.
     */
    CEILING_EXCEEDED,
}
