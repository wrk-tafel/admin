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

    /** The first customer of the day checked in - the desk has opened. */
    CHECKIN_STARTED,

    /** The first ticket appeared on the ticket screen - food is being handed out. */
    FOOD_HANDOUT_STARTED,

    /** Every household that checked in has been served. */
    ALL_TICKETS_PROCESSED,

    /** A route's driver has reached the last stop of the day and is about to head back. */
    ROUTE_AT_LAST_STOP,

    /** Every enabled route has its food collection fully recorded. */
    FOOD_COLLECTION_COMPLETED,

    /** An account was locked after too many consecutive failed logins. */
    USER_LOCKED_OUT,

    /**
     * A mail could not be sent, even after retrying - either one the application failed to build
     * (the after-close report mails) or one the outbox gave up on delivering. Named for the
     * after-close reports it was introduced for; kept under that name because the value is persisted
     * in `push_type_preferences`, so renaming it would silently opt every subscriber back out.
     */
    REPORT_MAIL_FAILED,
}
