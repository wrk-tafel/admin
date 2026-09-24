package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.stereotype.Service
import java.net.URLEncoder
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Time-based one-time passwords as an authenticator app computes them (RFC 6238 on top of RFC 4226:
 * HMAC-SHA1, 30 second steps, 6 digits) - the parameters every such app supports by default, so the
 * QR code the user scans needs no options beyond the secret.
 *
 * A code is accepted for the current step and the one either side of it, which is what absorbs a
 * phone clock that is a little off. [matchingStep] returns *which* step matched instead of a yes/no,
 * because the caller must remember it: a code is only good for one use, see `MfaService`.
 */
@Service
class TotpService(
    private val clock: Clock,
) {

    companion object {
        const val STEP_SECONDS = 30L
        const val DIGITS = 6
        private const val SECRET_BYTES = 20
        private const val ALLOWED_STEP_DRIFT = 1L
        private const val BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        private val secureRandom = SecureRandom()

        private val MODULUS = generateSequence(1) { it * 10 }.take(DIGITS + 1).last()
    }

    /** 160 random bits, Base32 encoded without padding - the form authenticator apps take. */
    fun generateSecret(): String {
        val bytes = ByteArray(SECRET_BYTES)
        secureRandom.nextBytes(bytes)
        return base32Encode(bytes)
    }

    /**
     * The `otpauth://` address a QR code carries. [issuer] and [account] appear in the app's list, so
     * a user with several entries can tell which is which.
     */
    fun otpauthUri(issuer: String, account: String, secret: String): String {
        val encodedIssuer = urlEncode(issuer)
        return "otpauth://totp/$encodedIssuer:${urlEncode(account)}?secret=$secret&issuer=$encodedIssuer" +
            "&algorithm=SHA1&digits=$DIGITS&period=$STEP_SECONDS"
    }

    /** The time step [code] is valid for, or `null` if it matches none of the accepted steps. */
    fun matchingStep(secret: String, code: String): Long? {
        val normalized = code.filterNot { it.isWhitespace() }
        if (normalized.length != DIGITS || !normalized.all { it in '0'..'9' }) {
            return null
        }

        val key = base32Decode(secret) ?: return null
        val currentStep = clock.instant().epochSecond / STEP_SECONDS
        val submitted = normalized.toByteArray(StandardCharsets.US_ASCII)

        // every step is computed and compared, whether or not an earlier one matched, so the time
        // taken says nothing about which step the code was for
        var matched: Long? = null
        for (step in (currentStep - ALLOWED_STEP_DRIFT)..(currentStep + ALLOWED_STEP_DRIFT)) {
            val expected = codeFor(key, step).toByteArray(StandardCharsets.US_ASCII)
            if (MessageDigest.isEqual(expected, submitted)) {
                matched = step
            }
        }
        return matched
    }

    /** The code for [step] - exposed to tests, which have to play the authenticator app. */
    fun codeAt(secret: String, step: Long): String = codeFor(base32Decode(secret)!!, step)

    private fun codeFor(key: ByteArray, step: Long): String {
        val mac = Mac.getInstance("HmacSHA1")
        mac.init(SecretKeySpec(key, "HmacSHA1"))
        val hash = mac.doFinal(ByteBuffer.allocate(Long.SIZE_BYTES).putLong(step).array())

        // dynamic truncation, RFC 4226 section 5.3
        val offset = hash.last().toInt() and 0x0f
        val binary = ((hash[offset].toInt() and 0x7f) shl 24) or
            ((hash[offset + 1].toInt() and 0xff) shl 16) or
            ((hash[offset + 2].toInt() and 0xff) shl 8) or
            (hash[offset + 3].toInt() and 0xff)
        return (binary % MODULUS).toString().padStart(DIGITS, '0')
    }

    private fun urlEncode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20")

    private fun base32Encode(bytes: ByteArray): String {
        val result = StringBuilder()
        var buffer = 0
        var bitsLeft = 0
        for (byte in bytes) {
            buffer = (buffer shl 8) or (byte.toInt() and 0xff)
            bitsLeft += 8
            while (bitsLeft >= 5) {
                result.append(BASE32_ALPHABET[(buffer shr (bitsLeft - 5)) and 0x1f])
                bitsLeft -= 5
            }
        }
        if (bitsLeft > 0) {
            result.append(BASE32_ALPHABET[(buffer shl (5 - bitsLeft)) and 0x1f])
        }
        return result.toString()
    }

    private fun base32Decode(encoded: String): ByteArray? {
        val result = java.io.ByteArrayOutputStream()
        var buffer = 0
        var bitsLeft = 0
        for (char in encoded.uppercase().trimEnd('=')) {
            val value = BASE32_ALPHABET.indexOf(char)
            if (value < 0) {
                return null
            }
            buffer = (buffer shl 5) or value
            bitsLeft += 5
            if (bitsLeft >= 8) {
                result.write((buffer shr (bitsLeft - 8)) and 0xff)
                bitsLeft -= 8
            }
        }
        return result.toByteArray()
    }
}
