package at.wrk.tafel.admin.backend.modules.push.internal

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.security.KeyPair
import java.security.SecureRandom
import java.security.interfaces.ECPublicKey
import java.util.Base64

/**
 * Verifies [WebPushEncryptionService] against RFC 8291/8188 by playing the receiving browser: the
 * test holds the subscription's private key and decrypts what the service produced (see
 * [WebPushSubscriberDecryption]). A round trip is the only assertion that actually pins the
 * derivation down - every intermediate value is either random per message or an opaque hash, so
 * asserting on them would only restate the implementation.
 */
internal class WebPushEncryptionServiceTest {

    private val service = WebPushEncryptionService()

    private val subscriptionKeys: KeyPair = WebPushEcKeys.generateKeyPair()
    private val subscriptionPublicKeyBytes = WebPushEcKeys.encodePublicKey(subscriptionKeys.public as ECPublicKey)
    private val p256dhKey = WebPushEcKeys.encodeBase64Url(subscriptionPublicKeyBytes)
    private val authSecret = ByteArray(16).also { SecureRandom().nextBytes(it) }
    private val authKey = WebPushEcKeys.encodeBase64Url(authSecret)

    private fun decryptAsSubscriber(body: ByteArray) = WebPushSubscriberDecryption.decrypt(
        body = body,
        subscriptionPrivateKey = subscriptionKeys.private,
        subscriptionPublicKey = subscriptionPublicKeyBytes,
        authSecret = authSecret,
    )

    @Test
    fun `encrypts a payload the subscription's own key can decrypt again`() {
        val payload = """{"notification":{"title":"Ausgabe beendet","body":"Danke!"}}"""

        val body = service.encrypt(p256dhKey, authKey, payload.toByteArray())

        assertThat(decryptAsSubscriber(body)).isEqualTo(payload)
    }

    @Test
    fun `handles a payload with non-ASCII characters`() {
        val payload = """{"body":"Grüße von der Tafel – 30 kg Gemüse"}"""

        val body = service.encrypt(p256dhKey, authKey, payload.toByteArray())

        assertThat(decryptAsSubscriber(body)).isEqualTo(payload)
    }

    @Test
    fun `accepts standard-alphabet base64 keys, not just base64url`() {
        // The same key material, re-encoded the way a client that used plain base64 would send it -
        // `+`/`/` instead of `-`/`_`, and with `=` padding.
        val standardBase64 = Base64.getEncoder()

        val body = service.encrypt(
            standardBase64.encodeToString(subscriptionPublicKeyBytes),
            standardBase64.encodeToString(authSecret),
            "{}".toByteArray(),
        )

        assertThat(decryptAsSubscriber(body)).isEqualTo("{}")
    }

    @Test
    fun `uses a fresh server key and salt for every message`() {
        val first = service.encrypt(p256dhKey, authKey, "{}".toByteArray())
        val second = service.encrypt(p256dhKey, authKey, "{}".toByteArray())

        assertThat(first).isNotEqualTo(second)
        assertThat(WebPushSubscriberDecryption.saltOf(first)).isNotEqualTo(WebPushSubscriberDecryption.saltOf(second))
        assertThat(WebPushSubscriberDecryption.serverPublicKeyOf(first))
            .isNotEqualTo(WebPushSubscriberDecryption.serverPublicKeyOf(second))
    }

    @Test
    fun `writes the record size and key length the aes128gcm header declares`() {
        val body = service.encrypt(p256dhKey, authKey, "{}".toByteArray())

        assertThat(WebPushSubscriberDecryption.recordSizeOf(body)).isEqualTo(4096)
        assertThat(WebPushSubscriberDecryption.declaredKeyIdLengthOf(body))
            .isEqualTo(WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH.toByte())
    }

    @Test
    fun `rejects a p256dh key that isn't a P-256 point`() {
        assertThatThrownBy { service.encrypt(WebPushEcKeys.encodeBase64Url(ByteArray(65)), authKey, "{}".toByteArray()) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
