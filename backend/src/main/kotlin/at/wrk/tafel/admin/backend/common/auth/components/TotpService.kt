package at.wrk.tafel.admin.backend.common.auth.components

import com.warrenstrange.googleauth.GoogleAuthenticator
import org.springframework.stereotype.Service
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock

/**
 * Time-based one-time passwords as an authenticator app computes them (RFC 6238 on top of RFC 4226:
 * HMAC-SHA1, 30 second steps, 6 digits, calculated by the GoogleAuth library) - the parameters every such app supports by default, so the
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

    // Its defaults are what authenticator apps expect - HMAC-SHA1, 30 second steps, 6 digits - and only its
    // code calculation is used: the secret is generated here (160 bits, where the library makes 80) and the
    // step window and the single-use rule live in matchingStep and MfaService.
    private val authenticator = GoogleAuthenticator()

    companion object {
        const val STEP_SECONDS = 30L
        const val DIGITS = 6
        private const val SECRET_BYTES = 20
        private const val ALLOWED_STEP_DRIFT = 1L
        private const val BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        private val secureRandom = SecureRandom()

        private const val MILLIS_PER_SECOND = 1000L
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

        val currentStep = clock.instant().epochSecond / STEP_SECONDS
        val submitted = normalized.toByteArray(StandardCharsets.US_ASCII)

        // every step is computed and compared, whether or not an earlier one matched, so the time
        // taken says nothing about which step the code was for
        var matched: Long? = null
        for (step in (currentStep - ALLOWED_STEP_DRIFT)..(currentStep + ALLOWED_STEP_DRIFT)) {
            val expected = codeAt(secret, step).toByteArray(StandardCharsets.US_ASCII)
            if (MessageDigest.isEqual(expected, submitted)) {
                matched = step
            }
        }
        return matched
    }

    /** The code for [step] - exposed to tests, which have to play the authenticator app. */
    fun codeAt(secret: String, step: Long): String = authenticator.getTotpPassword(secret, step * STEP_SECONDS * MILLIS_PER_SECOND).toString().padStart(DIGITS, '0')

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
}
