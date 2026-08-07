package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import nl.martijndwars.webpush.Encoding
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import nl.martijndwars.webpush.Urgency
import org.apache.http.HttpResponse
import org.apache.http.impl.client.CloseableHttpClient
import org.apache.http.util.EntityUtils
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service

enum class PushSendResult {
    SENT,

    /**
     * The subscription is permanently unusable and the caller should delete it: either the push
     * service reports it as gone (404/410), or it rejected our VAPID key as not matching the one
     * the subscription was created with (403 - e.g. FCM's "sender ID mismatch", which happens if
     * the server's VAPID keypair was rotated after the browser subscribed against the old public
     * key). Retrying a 403 without the subscriber re-subscribing under the current key can never
     * succeed, so it's treated the same as an expired subscription rather than left to fail
     * silently forever.
     */
    EXPIRED,

    /**
     * No VAPID keypair is configured, so nothing was even attempted (see `config.WebPushConfig`).
     * Distinct from [FAILED] because it's a deployment/configuration gap rather than a delivery
     * problem, and it's the one failure mode a user can be told something actionable about - see
     * `PushSubscriptionService.sendTestNotification`.
     */
    NOT_CONFIGURED,
    FAILED,
}

/**
 * Builds the actual [Notification] to send - split out from [WebPushSenderService] purely so tests
 * can substitute a fake that skips real EC key decoding (which requires structurally valid,
 * crypto-shaped key material - not something worth faking with real-looking key bytes just for a
 * unit test).
 *
 * Built through the builder rather than the `Notification(subscription, payload)` constructor
 * because that constructor leaves `Urgency` unset and `TTL` at the library's 28-day default, and
 * both matter for whether an Android device actually shows the notification while the PWA is
 * backgrounded or closed:
 *
 * - Without an `Urgency` header the push service applies `normal`, and FCM defers normal-urgency
 *   messages to the next maintenance window while the device is in Doze - so they only surface
 *   once something else wakes the device (typically the user opening the app). [URGENCY] of `high`
 *   is what tells FCM to deliver immediately, which is the whole point of an "Ausgabe gestartet"
 *   alert.
 * - A 28-day TTL means anything undelivered keeps queuing rather than expiring, which is why a
 *   backlog of long-obsolete notifications lands at once when the app is next opened. Every
 *   notification this app sends is about the distribution happening right now, so it is worthless
 *   after [TTL_SECONDS] and should expire at the push service instead.
 *
 * The `Topic` additionally makes the push service *replace* an undelivered message of the same
 * topic instead of stacking another one behind it, so a device that was unreachable gets the
 * latest state per topic rather than every intermediate message.
 */
@Component
class PushNotificationFactory {
    companion object {
        private val URGENCY = Urgency.HIGH

        /**
         * 12 hours - roughly the span of a distribution day (about 12:00-24:00, with the
         * "started"/"closed" alerts at either end). Long enough that a phone merely asleep or out
         * of signal for a few hours still gets told about the distribution the notification is
         * actually about, short enough that it can't resurface the next day when it means nothing.
         */
        private const val TTL_SECONDS = 12 * 60 * 60
    }

    fun create(subscription: Subscription, payload: String, topic: String): Notification = Notification.builder()
        .endpoint(subscription.endpoint)
        .userPublicKey(subscription.keys.p256dh)
        .userAuth(subscription.keys.auth)
        .payload(payload)
        .ttl(TTL_SECONDS)
        .urgency(URGENCY)
        .topic(topic)
        .build()
}

/**
 * Thin wrapper around `nl.martijndwars:web-push` (VAPID-signed Web Push). One attempt per call,
 * no retry - a missed distribution-closed alert on one device is low-stakes, and the browser's
 * own push service already handles its side of delivery/retry once a message reaches it.
 *
 * [pushService] is `null` whenever VAPID isn't configured (see `config.WebPushConfig`, which
 * builds it once from the configured keypair) - constructor-injected so tests can substitute a
 * mock instead of hitting a real push service over the network.
 *
 * The request is built with `preparePost` and executed through [httpClient] here rather than via
 * the library's own `PushService.send`, because two things about that method make every send to
 * FCM (i.e. every Chrome/Edge device) fail with `403 permission denied: crypto-key header had
 * invalid format`:
 *
 * 1. `send(notification)` defaults to the legacy `aesgcm` encoding, while its own
 *    `sendAsync(notification)` defaults to `aes128gcm` (RFC 8291). [ENCODING] is therefore passed
 *    explicitly rather than left to that default.
 * 2. Whatever the encoding, the library appends a `Crypto-Key: p256ecdsa=<key>` header whose value
 *    it base64url-encodes *with* `=` padding (unlike the `k=` parameter of the `Authorization`
 *    header, which it encodes without). FCM rejects the padded value outright. With `aes128gcm`
 *    the header carries no information the `Authorization: vapid t=..., k=...` header doesn't
 *    already carry, so it is dropped instead of repaired.
 *
 * Both are library bugs, not configuration problems, and 5.1.2 is its last release - so there's no
 * upgrade to wait for.
 */
@Service
class WebPushSenderService(
    private val pushService: PushService?,
    private val notificationFactory: PushNotificationFactory,
    private val httpClient: CloseableHttpClient,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(WebPushSenderService::class.java)
        private val ENCODING = Encoding.AES128GCM
        private const val CRYPTO_KEY_HEADER = "Crypto-Key"
    }

    /**
     * [topic] identifies which kind of notification this is, so the push service can replace a
     * still-undelivered message of the same topic rather than queue another one behind it - see
     * [PushNotificationFactory]. Must be at most 32 characters from the base64url alphabet
     * (RFC 8030 section 5.4).
     */
    fun send(subscriptionEntity: PushSubscriptionEntity, payload: String, topic: String): PushSendResult {
        val service = pushService
        if (service == null) {
            logger.warn("Skipped push send - VAPID isn't configured")
            return PushSendResult.NOT_CONFIGURED
        }

        return try {
            val subscription = Subscription(
                subscriptionEntity.endpoint,
                Subscription.Keys(subscriptionEntity.p256dhKey, subscriptionEntity.authKey),
            )
            val notification = notificationFactory.create(subscription, payload, topic)
            val request = service.preparePost(notification, ENCODING)
            request.removeHeaders(CRYPTO_KEY_HEADER)

            httpClient.execute(request).use { response ->
                when (val statusCode = response.statusLine.statusCode) {
                    in 200..299 -> PushSendResult.SENT
                    403, 404, 410 -> {
                        // Logged with the push service's own explanation: this outcome silently
                        // removes the subscription (see PushBroadcastService), so without it a
                        // rejected-by-the-push-service send is indistinguishable from a device that
                        // was never registered - which is exactly how a broken VAPID setup hides
                        // itself.
                        logger.warn(
                            "Push send to subscription #${subscriptionEntity.id} was rejected as gone with status $statusCode: ${readBody(response)}",
                        )
                        PushSendResult.EXPIRED
                    }

                    else -> {
                        logger.warn("Push send to subscription #${subscriptionEntity.id} failed with status $statusCode: ${readBody(response)}")
                        PushSendResult.FAILED
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Push send to subscription #${subscriptionEntity.id} failed", e)
            PushSendResult.FAILED
        }
    }

    /**
     * The push service's error body (e.g. FCM's "UnauthorizedRegistration"), best-effort: it's
     * only ever used for a log line, so a body that can't be read must not turn a handled
     * rejection into a thrown exception.
     */
    private fun readBody(response: HttpResponse): String = runCatching {
        response.entity?.let { EntityUtils.toString(it) }?.trim()?.takeIf { it.isNotEmpty() } ?: "<no response body>"
    }.getOrElse { "<response body unreadable: ${it.message}>" }
}
