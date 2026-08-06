package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.PermissionCategory
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper

/**
 * Sends a push notification to every enabled user holding a `LEADERSHIP`-category permission (see
 * [UserPermissions]) - shared by the various distribution-lifecycle push listeners so the
 * recipient-resolution/send/prune-expired-subscription logic lives in exactly one place.
 * Deliberately no `@Transactional`: each subscription send/prune below runs as its own
 * auto-transactional repository call - fine at this recipient volume, and avoids the
 * read-only-transaction-vs-delete conflict a single wrapping `@Transactional(readOnly = true)`
 * (as `reporting`'s listener uses) would create once expired subscriptions need deleting.
 */
@Service
class LeadershipPushNotificationService(
    private val userRepository: UserRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val webPushSenderService: WebPushSenderService,
    private val jsonMapper: JsonMapper,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(LeadershipPushNotificationService::class.java)
        private val LEADERSHIP_PERMISSION_KEYS = UserPermissions.entries
            .filter { it.category == PermissionCategory.LEADERSHIP }
            .map { it.key }
    }

    fun notifyLeadership(title: String, body: String) {
        val payload = jsonMapper.writeValueAsString(
            PushNotificationPayload(
                notification = PushNotificationPayloadNotification(title = title, body = body),
            ),
        )

        val recipients = userRepository.findAllByAuthoritiesNameInAndEnabledTrue(LEADERSHIP_PERMISSION_KEYS)
        recipients.forEach { user ->
            pushSubscriptionRepository.findAllByUserId(user.id!!).forEach { subscription ->
                when (webPushSenderService.send(subscription, payload)) {
                    PushSendResult.SENT -> Unit
                    PushSendResult.EXPIRED -> {
                        logger.info("Removing expired push subscription #${subscription.id}")
                        pushSubscriptionRepository.delete(subscription)
                    }

                    PushSendResult.FAILED -> logger.warn("Push notification to subscription #${subscription.id} failed")
                }
            }
        }
    }
}

@ExcludeFromTestCoverage
data class PushNotificationPayload(
    val notification: PushNotificationPayloadNotification,
)

@ExcludeFromTestCoverage
data class PushNotificationPayloadNotification(
    val title: String,
    val body: String,
    val icon: String = "/icons/icon-192x192.png",
)
