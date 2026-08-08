package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType

/**
 * Per notification type: who is allowed to receive it, and which screen tapping it opens.
 *
 * Both live in one table on purpose - they are two halves of the same question ("who is this for?"),
 * and keeping them together is what makes the settings screen and the delivered payload agree. Two
 * places read this: [PushBroadcastService], which filters recipients and builds the notification's
 * click target, and [PushPreferencesService], which lists only the types a user can actually receive
 * instead of offering toggles that would never fire.
 *
 * A type absent from [REQUIRED_PERMISSIONS] reaches everyone who has push enabled - the case for
 * every type that merely reports how the distribution day is going. Where a type *is* restricted,
 * the permissions listed are alternatives, not a conjunction: holding any one of them is enough.
 * Note that [UserPermissions.SUPERVISOR] is deliberately *not* a universal key here - the technical
 * types are for whoever maintains the application, which is not the same person as whoever leads
 * the distribution.
 */
object PushNotificationTypeTargeting {

    private val REQUIRED_PERMISSIONS: Map<PushNotificationType, Set<UserPermissions>> = mapOf(
        // Everything about how the distribution day is progressing is open to the whole team - the
        // types tracing that day are absent from this map on purpose. Restricted are only the two
        // ends of the spectrum: the reminder that something was left undone, and the technical
        // failures that are nobody's business but the people who fix them.
        PushNotificationType.DISTRIBUTION_STILL_OPEN to setOf(UserPermissions.DISTRIBUTION_LCM, UserPermissions.SUPERVISOR),
        PushNotificationType.USER_LOCKED_OUT to setOf(UserPermissions.ADMINISTRATOR),
        PushNotificationType.REPORT_MAIL_FAILED to setOf(UserPermissions.ADMINISTRATOR),
    )

    /**
     * Path below the app's base path that the notification opens, without a leading slash - see
     * [PushBroadcastService.absolutePath], which is what turns these into the URLs actually shipped
     * in the payload. Each one points at the screen the notification is asking someone to act on,
     * not merely at a related one: the "report mail failed" notification opens the mail settings
     * screen because that is where the resend lives, not the statistics screen the mail was about.
     */
    private val TARGET_PATHS: Map<PushNotificationType, String> = mapOf(
        PushNotificationType.DISTRIBUTION_STARTED to "uebersicht",
        PushNotificationType.DISTRIBUTION_CLOSED to "uebersicht",
        PushNotificationType.DISTRIBUTION_STILL_OPEN to "uebersicht",
        PushNotificationType.CHECKIN_STARTED to "uebersicht",
        PushNotificationType.FOOD_HANDOUT_STARTED to "uebersicht",
        PushNotificationType.ALL_TICKETS_PROCESSED to "uebersicht",
        PushNotificationType.FOOD_COLLECTION_COMPLETED to "logistik/warenerfassung",
        PushNotificationType.USER_LOCKED_OUT to "benutzer/anmelde-versuche",
        PushNotificationType.REPORT_MAIL_FAILED to "einstellungen/email",
    )

    /**
     * [authorities] are the raw authority names stored on the user (`users_authorities.name`), which
     * are [UserPermissions.key] values. An unknown name is simply not a permission we know about and
     * grants nothing, so it is ignored rather than treated as an error - a user's authority list can
     * outlive a permission being renamed or dropped.
     *
     * [UserPermissions.ADMINISTRATOR] grants everything, so it is checked first. It has to be
     * expanded here rather than relied upon from a token: a broadcast reaches people who are not
     * logged in - that is the entire point of a push notification - so the only authorities
     * available are the ones stored against the account.
     */
    fun isAllowedFor(type: PushNotificationType, authorities: Collection<String>): Boolean {
        if (authorities.any { it == UserPermissions.ADMINISTRATOR.key }) {
            return true
        }

        val required = REQUIRED_PERMISSIONS[type] ?: return true
        return required.any { permission -> authorities.any { it == permission.key } }
    }

    fun targetPathOf(type: PushNotificationType): String? = TARGET_PATHS[type]
}
