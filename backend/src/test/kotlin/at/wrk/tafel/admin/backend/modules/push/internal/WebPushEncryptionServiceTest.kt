package at.wrk.tafel.admin.backend.modules.push.internal

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.nio.ByteBuffer
import java.security.KeyPair
import java.security.SecureRandom
import java.security.interfaces.ECPublicKey
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Verifies [WebPushEncryptionService] against RFC 8291/8188 by playing the receiving browser: the
 * test holds the subscription's private key and decrypts what the service produced. A round trip is
 * the only assertion that actually pins the derivation down - every intermediate value is either
 * random per message or an opaque hash, so asserting on them would only restate the implementation.
 */
internal class WebPushEncryptionServiceTest {

    private val service = WebPushEncryptionService()

    private val subscriptionKeys: KeyPair = WebPushEcKeys.generateKeyPair()
    private val subscriptionPublicKeyBytes = WebPushEcKeys.encodePublicKey(subscriptionKeys.public as ECPublicKey)
    private val p256dhKey = WebPushEcKeys.encodeBase64Url(subscriptionPublicKeyBytes)
    private val authSecret = ByteArray(16).also { SecureRandom().nextBytes(it) }
    private val authKey = WebPushEcKeys.encodeBase64Url(authSecret)

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
        // The same key material, but re-encoded the way a client that used plain base64 would send
        // it - `+`/`/` instead of `-`/`_`, and with `=` padding.
        val standardBase64 = { bytes: ByteArray -> java.util.Base64.getEncoder().encodeToString(bytes) }

        val body = service.encrypt(standardBase64(subscriptionPublicKeyBytes), standardBase64(authSecret), "{}".toByteArray())

        assertThat(decryptAsSubscriber(body)).isEqualTo("{}")
    }

    @Test
    fun `uses a fresh server key and salt for every message`() {
        val first = service.encrypt(p256dhKey, authKey, "{}".toByteArray())
        val second = service.encrypt(p256dhKey, authKey, "{}".toByteArray())

        assertThat(first).isNotEqualTo(second)
        assertThat(saltOf(first)).isNotEqualTo(saltOf(second))
        assertThat(serverPublicKeyOf(first)).isNotEqualTo(serverPublicKeyOf(second))
    }

    @Test
    fun `writes the record size the aes128gcm header declares`() {
        val body = service.encrypt(p256dhKey, authKey, "{}".toByteArray())

        assertThat(ByteBuffer.wrap(body, 16, 4).int).isEqualTo(4096)
        assertThat(body[20]).isEqualTo(WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH.toByte())
    }

    @Test
    fun `rejects a p256dh key that isn't a P-256 point`() {
        assertThatThrownBy { service.encrypt(WebPushEcKeys.encodeBase64Url(ByteArray(65)), authKey, "{}".toByteArray()) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    private fun saltOf(body: ByteArray) = body.copyOfRange(0, 16)

    private fun serverPublicKeyOf(body: ByteArray) = body.copyOfRange(21, 21 + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH)

    /**
     * The receiving half of RFC 8291: read the salt and server public key out of the RFC 8188
     * header, redo the key derivation from the subscription's private key, and open the record.
     */
    private fun decryptAsSubscriber(body: ByteArray): String {
        val salt = saltOf(body)
        val serverPublicKeyBytes = serverPublicKeyOf(body)
        val ciphertext = body.copyOfRange(21 + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH, body.size)

        val sharedSecret = KeyAgreement.getInstance("ECDH").run {
            init(subscriptionKeys.private)
            doPhase(WebPushEcKeys.decodePublicKey(serverPublicKeyBytes), true)
            generateSecret()
        }

        val inputKeyingMaterial = hkdf(
            authSecret,
            sharedSecret,
            label("WebPush: info") + subscriptionPublicKeyBytes + serverPublicKeyBytes,
            32,
        )
        val contentEncryptionKey = hkdf(salt, inputKeyingMaterial, label("Content-Encoding: aes128gcm"), 16)
        val nonce = hkdf(salt, inputKeyingMaterial, label("Content-Encoding: nonce"), 12)

        val plaintext = Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, SecretKeySpec(contentEncryptionKey, "AES"), GCMParameterSpec(128, nonce))
            doFinal(ciphertext)
        }

        // The trailing 0x02 is RFC 8188's "this was the last record" delimiter, not payload.
        assertThat(plaintext.last()).isEqualTo(0x02.toByte())
        return String(plaintext.copyOf(plaintext.size - 1), Charsets.UTF_8)
    }

    private fun label(value: String): ByteArray = value.toByteArray(Charsets.US_ASCII) + 0x00.toByte()

    private fun hkdf(salt: ByteArray, keyingMaterial: ByteArray, info: ByteArray, length: Int): ByteArray {
        val pseudoRandomKey = hmacSha256(salt, keyingMaterial)
        return hmacSha256(pseudoRandomKey, info + 0x01.toByte()).copyOf(length)
    }

    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray = Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(key, "HmacSHA256"))
        doFinal(data)
    }
}
