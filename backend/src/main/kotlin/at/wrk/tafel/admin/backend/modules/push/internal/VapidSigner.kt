package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import io.jsonwebtoken.Jwts
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.net.URI
import java.security.interfaces.ECPrivateKey
import java.time.Duration
import java.time.Instant
import java.util.Date

/**
 * Builds the `Authorization: vapid t=<jwt>, k=<public key>` header that identifies this server to a
 * browser's push service (VAPID, RFC 8292). The token is an ES256-signed JWS over the push
 * endpoint's origin, an expiry and the configured contact subject.
 *
 * [isConfigured] is false whenever no usable VAPID keypair is configured - either because it's
 * absent (a deployment that simply doesn't do push) or because the configured key material can't be
 * decoded. Both are reported as [PushSendResult.NOT_CONFIGURED] rather than failing the whole
 * application at startup: push is an opt-in convenience, and taking the app down over it would turn
 * a mistyped key into an outage.
 */
@Component
class VapidSigner(tafelAdminProperties: TafelAdminProperties) {

    companion object {
        private val logger = LoggerFactory.getLogger(VapidSigner::class.java)

        /**
         * RFC 8292 caps a VAPID token's lifetime at 24 hours; half of that leaves plenty of room
         * for clock skew between this server and a push service while staying well inside the cap.
         */
        private val TOKEN_VALIDITY: Duration = Duration.ofHours(12)
    }

    private class VapidKeys(
        val privateKey: ECPrivateKey,
        val publicKeyBase64Url: String,
        val subject: String,
    )

    private val keys: VapidKeys? = readKeys(tafelAdminProperties)

    val isConfigured: Boolean
        get() = keys != null

    /**
     * @param endpoint the subscription's push endpoint - only its origin ends up in the token, as
     *   the `aud` claim.
     */
    fun authorizationHeader(endpoint: URI): String {
        val keys = checkNotNull(keys) { "VAPID isn't configured" }

        val token = Jwts.builder()
            // Optional per RFC 7519, but RFC 8292's own examples carry it and push services are
            // stricter than the spec in practice, so it's set rather than left to jjwt's default.
            .header().add("typ", "JWT").and()
            // `single`, not `add`: RFC 8292's `aud` is one origin, and jjwt's collection form would
            // serialize even a one-element audience as a JSON array. RFC 7519 allows that, but the
            // push services this talks to expect the plain string.
            .audience().single(originOf(endpoint))
            .expiration(Date.from(Instant.now().plus(TOKEN_VALIDITY)))
            .subject(keys.subject)
            .signWith(keys.privateKey, Jwts.SIG.ES256)
            .compact()

        return "vapid t=$token, k=${keys.publicKeyBase64Url}"
    }

    /** Scheme and authority only - the endpoint's path identifies the subscription and must not leak into the token. */
    private fun originOf(endpoint: URI): String {
        val port = if (endpoint.port == -1) "" else ":${endpoint.port}"
        return "${endpoint.scheme}://${endpoint.host}$port"
    }

    private fun readKeys(tafelAdminProperties: TafelAdminProperties): VapidKeys? {
        val push = tafelAdminProperties.push
        // Blank, not just null: a YAML `~` value can surface as an empty string rather than a
        // true absent/null property once flattened by Spring's YAML property source loader, so
        // a plain null-check alone isn't enough to detect "unconfigured" here.
        val publicKey = push?.vapidPublicKey?.takeIf { it.isNotBlank() }
        val privateKey = push?.vapidPrivateKey?.takeIf { it.isNotBlank() }
        val subject = push?.vapidSubject?.takeIf { it.isNotBlank() }
        if (publicKey == null || privateKey == null || subject == null) {
            return null
        }

        return runCatching {
            VapidKeys(
                privateKey = WebPushEcKeys.decodePrivateKey(WebPushEcKeys.decodeBase64Url(privateKey)),
                // Re-encoded from the decoded bytes rather than passed through, so the `k=` parameter
                // is always unpadded base64url even if the configured value carried padding.
                publicKeyBase64Url = WebPushEcKeys.encodeBase64Url(
                    WebPushEcKeys.decodeBase64Url(publicKey).also {
                        require(it.size == WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH) {
                            "The VAPID public key must be an uncompressed P-256 point (${WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH} bytes), got ${it.size}"
                        }
                    },
                ),
                subject = subject,
            )
        }.getOrElse {
            logger.error("The configured VAPID key material couldn't be decoded - push notifications stay disabled", it)
            null
        }
    }
}
