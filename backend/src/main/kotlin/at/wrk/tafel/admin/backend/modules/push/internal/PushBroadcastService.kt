package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper

/**
 * Sends a push notification of a given [PushNotificationType] to every existing subscription
 * whose owner currently allows it - shared by the various distribution-lifecycle push listeners
 * so the send/prune-expired-subscription logic lives in exactly one place. Subscribing is itself
 * the opt-in (any logged-in user can enable push notifications for their device, see
 * `PushController`/`PushSubscriptionService`); [PushPreferencesService] then further gates
 * delivery per subscription owner (master switch plus per-type opt-out). Deliberately no
 * `@Transactional`: each subscription send/prune below runs as its own auto-transactional
 * repository call - fine at this volume, and avoids the read-only-transaction-vs-delete conflict a
 * single wrapping `@Transactional(readOnly = true)` (as `reporting`'s listener uses) would create
 * once expired subscriptions need deleting.
 */
@Service
class PushBroadcastService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val pushPreferencesService: PushPreferencesService,
    private val webPushSenderService: WebPushSenderService,
    private val jsonMapper: JsonMapper,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(PushBroadcastService::class.java)
    }

    fun broadcast(type: PushNotificationType, title: String, body: String) {
        // Memoized per user within this one broadcast call - a user with several devices would
        // otherwise trigger the same preference lookup once per device.
        val preferenceCache = mutableMapOf<Long, Boolean>()

        pushSubscriptionRepository.findAll().forEach { subscription ->
            val userId = subscription.user?.id ?: return@forEach
            val allowed = preferenceCache.getOrPut(userId) { pushPreferencesService.isEnabled(userId, type) }
            if (!allowed) {
                return@forEach
            }

            sendTo(subscription, title, body)
        }
    }

    /**
     * Sends to one specific subscription, pruning it if the push service reports it as gone -
     * the single-device counterpart of [broadcast], used by the per-device test notification
     * (`PushSubscriptionService.sendTestNotification`). Deliberately *not* gated by
     * [PushPreferencesService]: it's triggered by an explicit click on that device's own "test"
     * button, so it has to reach the device even while a preference toggle is off - otherwise the
     * one button meant to answer "does push work on this device at all?" would silently do nothing.
     */
    fun sendTo(subscription: PushSubscriptionEntity, title: String, body: String): PushSendResult {
        val payload = jsonMapper.writeValueAsString(
            PushNotificationPayload(
                notification = PushNotificationPayloadNotification(title = title, body = body),
            ),
        )

        val result = webPushSenderService.send(subscription, payload)
        when (result) {
            PushSendResult.SENT -> Unit
            PushSendResult.EXPIRED -> {
                logger.info("Removing expired push subscription #${subscription.id}")
                pushSubscriptionRepository.delete(subscription)
            }

            PushSendResult.NOT_CONFIGURED -> logger.warn("Push notification to subscription #${subscription.id} skipped - VAPID isn't configured")
            PushSendResult.FAILED -> logger.warn("Push notification to subscription #${subscription.id} failed")
        }
        return result
    }
}

@ExcludeFromTestCoverage
data class PushNotificationPayload(
    val notification: PushNotificationPayloadNotification,
)

/**
 * Both icon paths are resolved by the browser against the app's own origin (the Angular service
 * worker passes them straight through to `showNotification`, see `ngsw-worker.js`), so they have to
 * match files actually shipped under `frontend/.../public/icons/`.
 *
 * [icon] and [badge] are two different images on purpose, not a duplicated setting: [icon] is the
 * full-colour logo shown inside the notification itself, while [badge] is the small monochrome
 * mark Android puts in the status bar and next to the app name in the notification shade. Android
 * uses only the badge's alpha channel and tints the result, so it must be a white-on-transparent
 * silhouette - handing it the colour logo instead renders as a featureless filled blob, and
 * omitting it altogether falls back to a generic Chrome icon with no Tafel branding at all.
 */
@ExcludeFromTestCoverage
data class PushNotificationPayloadNotification(
    val title: String,
    val body: String,
    val icon: String = "/icons/icon-192x192.png",
    val badge: String = "/icons/badge-96x96.png",
)
