package at.wrk.tafel.admin.backend.database.model.push

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Persisted as a string (see [PushTypePreferenceEntity]), so adding a value here needs no migration.
 * Who may receive each type, and where tapping its notification leads, is decided in
 * `modules.push.internal.PushNotificationTypeTargeting` - deliberately not here, since that is
 * module-level policy and this layer must stay below the feature modules.
 */
@ExcludeFromTestCoverage
enum class PushNotificationType {
    DISTRIBUTION_STARTED,
    DISTRIBUTION_CLOSED,

    /** A distribution was never closed and is still open on a later day. */
    DISTRIBUTION_STILL_OPEN,

    /** A distribution closed while not every enabled route had its food collection fully recorded. */
    FOOD_COLLECTION_INCOMPLETE,

    /** An account was locked after too many consecutive failed logins. */
    USER_LOCKED_OUT,

    /** One of the after-close report mails could not be sent, even after retrying. */
    REPORT_MAIL_FAILED,
}
