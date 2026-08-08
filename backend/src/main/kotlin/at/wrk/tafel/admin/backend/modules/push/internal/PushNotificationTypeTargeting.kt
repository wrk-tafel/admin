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
 * A type absent from [REQUIRED_PERMISSIONS] reaches everyone who has push enabled - that is the case
 * for the two distribution-lifecycle types, which concern the whole team and predate any targeting.
 * Where a type *is* restricted, the permissions listed are alternatives, not a conjunction: holding
 * any one of them is enough. [UserPermissions.SUPERVISOR] is listed on every restricted type so the
 * leadership role keeps seeing everything.
 */
object PushNotificationTypeTargeting {

    private val REQUIRED_PERMISSIONS: Map<PushNotificationType, Set<UserPermissions>> = mapOf(
        PushNotificationType.DISTRIBUTION_STILL_OPEN to setOf(UserPermissions.DISTRIBUTION_LCM, UserPermissions.SUPERVISOR),
        PushNotificationType.FOOD_COLLECTION_INCOMPLETE to setOf(UserPermissions.LOGISTICS, UserPermissions.SUPERVISOR),
        PushNotificationType.USER_LOCKED_OUT to setOf(UserPermissions.USER_MANAGEMENT, UserPermissions.SUPERVISOR),
        PushNotificationType.REPORT_MAIL_FAILED to setOf(UserPermissions.STATISTICS, UserPermissions.SUPERVISOR),
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
        PushNotificationType.FOOD_COLLECTION_INCOMPLETE to "logistik/warenerfassung",
        PushNotificationType.USER_LOCKED_OUT to "benutzer/anmelde-versuche",
        PushNotificationType.REPORT_MAIL_FAILED to "einstellungen/email",
    )

    /**
     * [authorities] are the raw authority names stored on the user (`users_authorities.name`), which
     * are [UserPermissions.key] values. An unknown name is simply not a permission we know about and
     * grants nothing, so it is ignored rather than treated as an error - a user's authority list can
     * outlive a permission being renamed or dropped.
     */
    fun isAllowedFor(type: PushNotificationType, authorities: Collection<String>): Boolean {
        val required = REQUIRED_PERMISSIONS[type] ?: return true
        return required.any { permission -> authorities.any { it == permission.key } }
    }

    fun targetPathOf(type: PushNotificationType): String? = TARGET_PATHS[type]
}
