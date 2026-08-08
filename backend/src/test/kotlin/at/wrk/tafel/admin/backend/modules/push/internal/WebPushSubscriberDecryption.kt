package at.wrk.tafel.admin.backend.modules.push.internal

import java.nio.ByteBuffer
import java.security.PrivateKey
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The receiving half of RFC 8291, as the browser performs it: read the salt and the server's
 * ephemeral public key out of the RFC 8188 header, redo the key derivation from the subscription's
 * own private key, and open the record.
 *
 * Deliberately a second, independent implementation rather than anything shared with
 * [WebPushEncryptionService] - a round trip through the production code's own helpers would pass
 * just as happily if both halves were wrong in the same way. It reads the RFCs' constants and
 * layout out literally for the same reason.
 */
internal object WebPushSubscriberDecryption {

    private const val SALT_LENGTH = 16
    private const val RECORD_SIZE_LENGTH = 4
    private const val KEY_ID_LENGTH_LENGTH = 1
    private const val HEADER_LENGTH = SALT_LENGTH + RECORD_SIZE_LENGTH + KEY_ID_LENGTH_LENGTH

    fun saltOf(body: ByteArray): ByteArray = body.copyOfRange(0, SALT_LENGTH)

    fun recordSizeOf(body: ByteArray): Int = ByteBuffer.wrap(body, SALT_LENGTH, RECORD_SIZE_LENGTH).int

    fun declaredKeyIdLengthOf(body: ByteArray): Byte = body[SALT_LENGTH + RECORD_SIZE_LENGTH]

    fun serverPublicKeyOf(body: ByteArray): ByteArray = body.copyOfRange(HEADER_LENGTH, HEADER_LENGTH + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH)

    fun ciphertextOf(body: ByteArray): ByteArray = body.copyOfRange(HEADER_LENGTH + WebPushEcKeys.UNCOMPRESSED_POINT_LENGTH, body.size)

    /**
     * @param subscriptionPrivateKey the private half of the `p256dh` key the message was sent to.
     * @param subscriptionPublicKey that key's uncompressed point - part of the derivation, not just
     *   something the sender needed.
     * @param authSecret the raw `auth` secret shared with the sender.
     */
    fun decrypt(
        body: ByteArray,
        subscriptionPrivateKey: PrivateKey,
        subscriptionPublicKey: ByteArray,
        authSecret: ByteArray,
    ): String {
        val salt = saltOf(body)
        val serverPublicKey = serverPublicKeyOf(body)

        val sharedSecret = KeyAgreement.getInstance("ECDH").run {
            init(subscriptionPrivateKey)
            doPhase(WebPushEcKeys.decodePublicKey(serverPublicKey), true)
            generateSecret()
        }

        val inputKeyingMaterial = hkdf(
            salt = authSecret,
            keyingMaterial = sharedSecret,
            info = label("WebPush: info") + subscriptionPublicKey + serverPublicKey,
            length = 32,
        )
        val plaintext = Cipher.getInstance("AES/GCM/NoPadding").run {
            init(
                Cipher.DECRYPT_MODE,
                SecretKeySpec(hkdf(salt, inputKeyingMaterial, label("Content-Encoding: aes128gcm"), 16), "AES"),
                GCMParameterSpec(128, hkdf(salt, inputKeyingMaterial, label("Content-Encoding: nonce"), 12)),
            )
            doFinal(ciphertextOf(body))
        }

        check(plaintext.last() == LAST_RECORD_DELIMITER) { "The record isn't terminated by RFC 8188's 0x02 delimiter" }
        return String(plaintext.copyOf(plaintext.size - 1), Charsets.UTF_8)
    }

    private const val LAST_RECORD_DELIMITER: Byte = 0x02

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
