package at.wrk.tafel.admin.backend.modules.push.internal

import org.springframework.stereotype.Service
import java.nio.ByteBuffer
import java.security.SecureRandom
import java.security.interfaces.ECPublicKey
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Encrypts a push payload for one subscription with `aes128gcm` (RFC 8291 "Message Encryption for
 * Web Push", which builds on RFC 8188 "Encrypted Content-Encoding for HTTP").
 *
 * The message key is derived from an ECDH agreement between a freshly generated server keypair and
 * the subscription's own `p256dh` public key, mixed with the subscription's `auth` secret. Only the
 * browser that created the subscription holds the matching private key, so the push service in
 * between forwards the message without being able to read it. A new ephemeral keypair and a new
 * salt per message are what keep that safe - neither is ever reused across sends.
 */
@Service
class WebPushEncryptionService {

    companion object {
        private const val HMAC_ALGORITHM = "HmacSHA256"
        private const val CIPHER_ALGORITHM = "AES/GCM/NoPadding"
        private const val KEY_AGREEMENT_ALGORITHM = "ECDH"
        private const val AES_KEY_LENGTH = 16
        private const val INPUT_KEYING_MATERIAL_LENGTH = 32
        private const val NONCE_LENGTH = 12
        private const val GCM_TAG_LENGTH_BITS = 128
        private const val SALT_LENGTH = 16

        /**
         * The single record every payload here fits into. RFC 8188 allows a body to be split into
         * several records of this size; a notification is a few hundred bytes, so it never is.
         */
        private const val RECORD_SIZE = 4096

        /** RFC 8188's delimiter marking the end of the payload within the last record. */
        private const val LAST_RECORD_DELIMITER: Byte = 0x02

        /**
         * HKDF `info` labels. Each is the literal ASCII string followed by a NUL byte - the
         * separator the RFCs put between the label and whatever context follows it, and part of
         * the input even where nothing follows.
         */
        private val KEY_INFO = asciiLabel("WebPush: info")
        private val CONTENT_ENCRYPTION_KEY_INFO = asciiLabel("Content-Encoding: aes128gcm")
        private val NONCE_INFO = asciiLabel("Content-Encoding: nonce")

        private fun asciiLabel(label: String): ByteArray = label.toByteArray(Charsets.US_ASCII) + 0x00.toByte()
    }

    private val secureRandom = SecureRandom()

    /**
     * @param p256dhKey the subscription's public key, base64url-encoded (an uncompressed P-256 point).
     * @param authKey the subscription's shared auth secret, base64url-encoded.
     * @return the complete request body: RFC 8188's header (salt, record size, server public key)
     *   followed by the single encrypted record.
     */
    fun encrypt(p256dhKey: String, authKey: String, payload: ByteArray): ByteArray {
        val subscriptionPublicKeyBytes = WebPushEcKeys.decodeBase64Url(p256dhKey)
        val subscriptionPublicKey = WebPushEcKeys.decodePublicKey(subscriptionPublicKeyBytes)
        val authSecret = WebPushEcKeys.decodeBase64Url(authKey)

        val serverKeyPair = WebPushEcKeys.generateKeyPair()
        val serverPublicKeyBytes = WebPushEcKeys.encodePublicKey(serverKeyPair.public as ECPublicKey)

        val sharedSecret = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM).run {
            init(serverKeyPair.private)
            doPhase(subscriptionPublicKey, true)
            generateSecret()
        }

        val salt = ByteArray(SALT_LENGTH).also { secureRandom.nextBytes(it) }

        // Two stacked HKDFs, as RFC 8291 §3.3/3.4 prescribes: the auth secret first binds the ECDH
        // output to this specific subscription, and only the result of that is then expanded with
        // the per-message salt into the content encryption key and the nonce.
        val inputKeyingMaterial = hkdf(
            salt = authSecret,
            keyingMaterial = sharedSecret,
            info = KEY_INFO + subscriptionPublicKeyBytes + serverPublicKeyBytes,
            length = INPUT_KEYING_MATERIAL_LENGTH,
        )
        val contentEncryptionKey = hkdf(salt, inputKeyingMaterial, CONTENT_ENCRYPTION_KEY_INFO, AES_KEY_LENGTH)
        val nonce = hkdf(salt, inputKeyingMaterial, NONCE_INFO, NONCE_LENGTH)

        val cipher = Cipher.getInstance(CIPHER_ALGORITHM).apply {
            init(
                Cipher.ENCRYPT_MODE,
                SecretKeySpec(contentEncryptionKey, "AES"),
                GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce),
            )
        }
        val ciphertext = cipher.doFinal(payload + LAST_RECORD_DELIMITER)

        return ByteBuffer.allocate(SALT_LENGTH + Int.SIZE_BYTES + 1 + serverPublicKeyBytes.size + ciphertext.size)
            .put(salt)
            .putInt(RECORD_SIZE)
            .put(serverPublicKeyBytes.size.toByte())
            .put(serverPublicKeyBytes)
            .put(ciphertext)
            .array()
    }

    /**
     * HKDF (RFC 5869) with a single expansion block - every derivation here asks for at most the 32
     * bytes one HMAC-SHA-256 round produces, so the block counter never goes past `0x01`.
     */
    private fun hkdf(salt: ByteArray, keyingMaterial: ByteArray, info: ByteArray, length: Int): ByteArray {
        val pseudoRandomKey = hmacSha256(key = salt, data = keyingMaterial)
        return hmacSha256(key = pseudoRandomKey, data = info + 0x01.toByte()).copyOf(length)
    }

    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray = Mac.getInstance(HMAC_ALGORITHM).run {
        init(SecretKeySpec(key, HMAC_ALGORITHM))
        doFinal(data)
    }
}
