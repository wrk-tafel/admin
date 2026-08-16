package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper

/**
 * Sends a push notification of a given [PushNotificationType] to every existing subscription
 * whose owner currently allows it - shared by the various push listeners so the send/prune-expired-
 * subscription logic lives in exactly one place. Subscribing is itself the opt-in (any logged-in
 * user can enable push notifications for their device, see `PushController`/`PushSubscriptionService`),
 * and delivery is then gated twice per subscription owner: by what the type is *for*
 * ([PushNotificationTypeTargeting], the user's permissions) and by what the user asked for
 * ([PushPreferencesService], master switch plus per-type opt-out). Deliberately no
 * `@Transactional`: each subscription send/prune below runs as its own auto-transactional
 * repository call - fine at this volume, and avoids the read-only-transaction-vs-write conflict a
 * single wrapping `@Transactional(readOnly = true)` would create once expired subscriptions need
 * deleting. Postgres refuses the write outright in that case, which is how the after-close report
 * mails silently stopped being queued (see `MailOutboxService.enqueue`).
 */
@Service
class PushBroadcastService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val pushPreferencesService: PushPreferencesService,
    private val webPushSenderService: WebPushSenderService,
    private val jsonMapper: JsonMapper,
    private val tafelAdminProperties: TafelAdminProperties,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(PushBroadcastService::class.java)
    }

    fun broadcast(type: PushNotificationType, title: String, body: String) {
        // Memoized per user within this one broadcast call - a user with several devices would
        // otherwise trigger the same permission and preference lookup once per device.
        val recipientCache = mutableMapOf<Long, Boolean>()
        val targetPath = PushNotificationTypeTargeting.targetPathOf(type) ?: ""

        val resultCounts = mutableMapOf<PushSendResult, Int>()
        pushSubscriptionRepository.findAll().forEach { subscription ->
            val user = subscription.user ?: return@forEach
            val userId = user.id ?: return@forEach

            val allowed = recipientCache.getOrPut(userId) {
                // Permissions first: an in-memory check on the eagerly loaded authorities, so a
                // user who isn't an audience for this type at all costs no preference query.
                PushNotificationTypeTargeting.isAllowedFor(type, user.authorities.map { it.name }) &&
                    pushPreferencesService.isEnabled(userId, type)
            }
            if (!allowed) {
                return@forEach
            }

            val result = sendTo(subscription, title, body, targetPath)
            resultCounts.merge(result, 1, Int::plus)
        }

        // One summary line per broadcast, on top of sendTo's per-subscription logging: without it,
        // "the push service was down for ten minutes" and "one phone is unreachable" are
        // indistinguishable in the logs, so an outage isn't greppable as one. Logged even when
        // nothing failed, so a broadcast with zero eligible subscriptions is visible too, e.g. an
        // administrator wondering why nobody's phone rang.
        val sent = resultCounts[PushSendResult.SENT] ?: 0
        val failed = resultCounts[PushSendResult.FAILED] ?: 0
        val expired = resultCounts[PushSendResult.EXPIRED] ?: 0
        val notConfigured = resultCounts[PushSendResult.NOT_CONFIGURED] ?: 0
        if (failed > 0) {
            logger.warn(
                "Broadcast {} finished: {} sent, {} failed, {} expired, {} not-configured",
                type,
                sent,
                failed,
                expired,
                notConfigured,
            )
        } else {
            logger.info(
                "Broadcast {} finished: {} sent, {} failed, {} expired, {} not-configured",
                type,
                sent,
                failed,
                expired,
                notConfigured,
            )
        }
    }

    /**
     * Sends to one specific subscription, pruning it if the push service reports it as gone -
     * the single-device counterpart of [broadcast], used by the per-device test notification
     * (`PushSubscriptionService.sendTestNotification`). Deliberately *not* gated by
     * [PushPreferencesService]: it's triggered by an explicit click on that device's own "test"
     * button, so it has to reach the device even while a preference toggle is off - otherwise the
     * one button meant to answer "does push work on this device at all?" would silently do nothing.
     *
     * [targetPath] is the screen tapping the notification opens, relative to the app's base path;
     * an empty string opens the app itself.
     */
    fun sendTo(subscription: PushSubscriptionEntity, title: String, body: String, targetPath: String): PushSendResult {
        val payload = jsonMapper.writeValueAsString(
            PushNotificationPayload(
                notification = PushNotificationPayloadNotification(
                    title = title,
                    body = body,
                    icon = absolutePath("icons/icon-192x192.png"),
                    badge = absolutePath("icons/badge-96x96.png"),
                    data = PushNotificationPayloadData(
                        onActionClick = PushNotificationPayloadActions(
                            default = PushNotificationPayloadAction(
                                operation = "navigateLastFocusedOrOpen",
                                url = absolutePath(targetPath),
                            ),
                        ),
                    ),
                ),
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

    /**
     * Icon and click-target URLs have to be built against the app's own base path, not the origin
     * root: dev, test and prod share one origin at different path prefixes (see
     * [at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties.relativeBaseUrl]), so
     * a bare `/icons/...` resolves to the *host* root on every deployment that isn't served at `/`
     * and 404s - which shows up as a notification with no icon and nothing else wrong. The same
     * mistake in a click target lands the user on a 404 instead of the screen they were sent to.
     *
     * Read per send rather than cached, so a reloaded configuration takes effect (see
     * `config.properties.ConfigFileReloadService`).
     */
    private fun absolutePath(path: String) = "${tafelAdminProperties.server.basePath}$path"
}

@ExcludeFromTestCoverage
data class PushNotificationPayload(
    val notification: PushNotificationPayloadNotification,
)

/**
 * Both icon paths are handed straight to `showNotification` by the Angular service worker (see
 * `ngsw-worker.js`) and resolved by the browser from there, so they have to match files actually
 * shipped under `frontend/.../public/icons/` *and* be addressed below the app's base path - see
 * [PushBroadcastService.iconPath], which is why neither carries a default here.
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
    val icon: String,
    val badge: String,
    val data: PushNotificationPayloadData,
)

/**
 * The Angular service worker's own click-handling contract: it reads `notification.data.onActionClick`
 * and acts on the entry matching the clicked action, falling back to `default` for a click on the
 * notification body itself - which is the only case here, since we declare no action buttons. This
 * is why tapping a notification navigates without a single line of frontend code: `ngsw-worker.js`
 * implements it, so the shape below has to match what it expects rather than anything of ours.
 */
@ExcludeFromTestCoverage
data class PushNotificationPayloadData(
    val onActionClick: PushNotificationPayloadActions,
)

@ExcludeFromTestCoverage
data class PushNotificationPayloadActions(
    val default: PushNotificationPayloadAction,
)

/**
 * [operation] is `navigateLastFocusedOrOpen` throughout: an already-open app tab navigates to
 * [url] in place rather than a second tab opening beside it, and only a user with no tab open at
 * all gets a new one. That matters more here than it looks - the app holds several permanent SSE
 * streams, and duplicate tabs multiply them against a browser connection budget this app already
 * uses most of.
 */
@ExcludeFromTestCoverage
data class PushNotificationPayloadAction(
    val operation: String,
    val url: String,
)
