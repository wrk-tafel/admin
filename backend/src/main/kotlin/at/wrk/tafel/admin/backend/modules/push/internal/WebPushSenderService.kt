package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.net.ProxySelector
import java.net.URI
import java.net.http.HttpClient
import java.time.Duration

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
     * No usable VAPID keypair is configured, so nothing was even attempted (see [VapidSigner]).
     * Distinct from [FAILED] because it's a deployment/configuration gap rather than a delivery
     * problem, and it's the one failure mode a user can be told something actionable about - see
     * `PushSubscriptionService.sendTestNotification`.
     */
    NOT_CONFIGURED,
    FAILED,
}

/**
 * Sends one VAPID-signed Web Push message to one subscription. One attempt per call, no retry - a
 * missed distribution-closed alert on one device is low-stakes, and the browser's own push service
 * already handles its side of delivery/retry once a message reaches it.
 *
 * The two halves of the message are built by [VapidSigner] (the `Authorization` header identifying
 * this server, RFC 8292) and [WebPushEncryptionService] (the encrypted body, RFC 8291); this class
 * only assembles them into the HTTP request and maps the push service's answer onto a
 * [PushSendResult].
 *
 * [restClient] is a constructor parameter with a default rather than an injected bean so tests can
 * bind a `MockRestServiceServer` to it - the same shape `support.internal.SupportService` uses.
 */
@Service
class WebPushSenderService(
    private val vapidSigner: VapidSigner,
    private val encryptionService: WebPushEncryptionService,
    private val restClient: RestClient = defaultRestClient(),
) {
    companion object {
        private val logger = LoggerFactory.getLogger(WebPushSenderService::class.java)

        private const val CONTENT_ENCODING = "aes128gcm"
        private const val TTL_HEADER = "TTL"
        private const val URGENCY_HEADER = "Urgency"

        /**
         * Without an `Urgency` header the push service applies `normal`, and FCM defers
         * normal-urgency messages to the next maintenance window while the device is in Doze - so
         * they only surface once something else wakes the device (typically the user opening the
         * app). `high` is what tells FCM to deliver immediately, which is the whole point of an
         * "Ausgabe gestartet" alert.
         */
        private const val URGENCY = "high"

        /**
         * How long the push service may hold a message for a device that's currently offline, in
         * seconds. 12 hours is roughly the span of a distribution day (about 12:00-24:00, with the
         * "started"/"closed" alerts at either end): long enough that a phone merely asleep or out
         * of signal for a few hours still gets told about the distribution the notification is
         * actually about, short enough that it can't resurface the next day when it means nothing.
         */
        private const val TTL_SECONDS = "${12 * 60 * 60}"

        /**
         * Both timeouts matter more here than the numbers themselves: `PushBroadcastService` walks
         * every subscription in one synchronous loop, so an unreachable push service that never
         * answers would otherwise stall the whole broadcast rather than costing one device its
         * notification.
         */
        private val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(10)
        private val READ_TIMEOUT: Duration = Duration.ofSeconds(30)

        /**
         * Proxy settings are taken from the JVM's own selector (`http.proxyHost` and friends), which
         * the JDK's [HttpClient] does not consult unless it's handed one explicitly.
         */
        private fun defaultRestClient(): RestClient {
            val httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .apply { ProxySelector.getDefault()?.let { proxy(it) } }
                .build()
            val requestFactory = JdkClientHttpRequestFactory(httpClient).apply { setReadTimeout(READ_TIMEOUT) }
            return RestClient.builder().requestFactory(requestFactory).build()
        }
    }

    /**
     * Deliberately *no* RFC 8030 `Topic` header, even though replacing an undelivered notification
     * of the same kind instead of stacking another one behind it sounds like exactly what this app
     * wants: FCM maps that header onto its own collapse key, and collapsible messages are
     * rate-limited per app, device and collapse key - a burst of 20, refilling at one message every
     * three minutes, with everything over that budget silently dropped rather than queued. Every
     * notification here would share one of three topics, so repeated sends land in one bucket and
     * stop arriving: pressing the test button ten times delivers about one of them, and a device
     * whose budget is already spent gets nothing at all. [TTL_SECONDS] already keeps an undelivered
     * backlog from outliving the distribution it's about, which is what the topic was wanted for in
     * the first place.
     */
    fun send(subscriptionEntity: PushSubscriptionEntity, payload: String): PushSendResult {
        if (!vapidSigner.isConfigured) {
            logger.warn("Skipped push send - VAPID isn't configured")
            return PushSendResult.NOT_CONFIGURED
        }

        return try {
            val endpoint = URI.create(requireNotNull(subscriptionEntity.endpoint) { "The subscription has no endpoint" })
            val body = encryptionService.encrypt(
                p256dhKey = requireNotNull(subscriptionEntity.p256dhKey) { "The subscription has no p256dh key" },
                authKey = requireNotNull(subscriptionEntity.authKey) { "The subscription has no auth key" },
                payload = payload.toByteArray(),
            )

            restClient.post()
                // A URI, not a string: the endpoint is an opaque, already-encoded URL from the push
                // service, and RestClient would otherwise read it as a URI template.
                .uri(endpoint)
                .header(HttpHeaders.AUTHORIZATION, vapidSigner.authorizationHeader(endpoint))
                .header(HttpHeaders.CONTENT_ENCODING, CONTENT_ENCODING)
                .header(TTL_HEADER, TTL_SECONDS)
                .header(URGENCY_HEADER, URGENCY)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(body)
                // exchange rather than retrieve: the interesting statuses below are exactly the ones
                // retrieve turns into an exception.
                .exchange { _, response ->
                    when (val statusCode = response.statusCode.value()) {
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
    private fun readBody(response: RestClient.RequestHeadersSpec.ConvertibleClientHttpResponse): String = runCatching {
        response.bodyTo(String::class.java)?.trim()?.takeIf { it.isNotEmpty() } ?: "<no response body>"
    }.getOrElse { "<response body unreadable: ${it.message}>" }
}
