package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service

enum class PushSendResult {
    SENT,

    /** The push service reported the subscription as gone (404/410) - the caller should delete it. */
    EXPIRED,
    FAILED,
}

/**
 * Builds the actual [Notification] to send - split out from [WebPushSenderService] purely so tests
 * can substitute a fake that skips real EC key decoding (which requires structurally valid,
 * crypto-shaped key material - not something worth faking with real-looking key bytes just for a
 * unit test).
 */
@Component
class PushNotificationFactory {
    fun create(subscription: Subscription, payload: String): Notification = Notification(subscription, payload)
}

/**
 * Thin wrapper around `nl.martijndwars:web-push` (VAPID-signed Web Push). One attempt per call,
 * no retry - a missed distribution-closed alert on one device is low-stakes, and the browser's
 * own push service already handles its side of delivery/retry once a message reaches it.
 *
 * [pushService] is `null` whenever VAPID isn't configured (see `config.WebPushConfig`, which
 * builds it once from the configured keypair) - constructor-injected so tests can substitute a
 * mock instead of hitting a real push service over the network.
 */
@Service
class WebPushSenderService(
    private val pushService: PushService?,
    private val notificationFactory: PushNotificationFactory,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(WebPushSenderService::class.java)
    }

    fun send(subscriptionEntity: PushSubscriptionEntity, payload: String): PushSendResult {
        val service = pushService
        if (service == null) {
            logger.warn("Skipped push send - VAPID isn't configured")
            return PushSendResult.FAILED
        }

        return try {
            val subscription = Subscription(
                subscriptionEntity.endpoint,
                Subscription.Keys(subscriptionEntity.p256dhKey, subscriptionEntity.authKey),
            )
            val notification = notificationFactory.create(subscription, payload)
            val response = service.send(notification)
            when (val statusCode = response.statusLine.statusCode) {
                in 200..299 -> PushSendResult.SENT
                404, 410 -> PushSendResult.EXPIRED
                else -> {
                    logger.warn("Push send to subscription #${subscriptionEntity.id} failed with status $statusCode")
                    PushSendResult.FAILED
                }
            }
        } catch (e: Exception) {
            logger.error("Push send to subscription #${subscriptionEntity.id} failed", e)
            PushSendResult.FAILED
        }
    }
}
