package at.wrk.tafel.admin.backend.common.auth.components

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * The tokens behind the links the application mails (ADR-0072): 256 random bits, URL-safe, and only
 * ever stored as their SHA-256. A plain hash without a salt is enough here - unlike a password, the
 * token has 256 bits of entropy, so there is nothing to guess from the hash.
 */
object SingleUseToken {
    private const val TOKEN_BYTES = 32
    private val secureRandom = SecureRandom()

    fun generate(): String {
        val bytes = ByteArray(TOKEN_BYTES)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun hash(token: String): String = MessageDigest.getInstance("SHA-256")
        .digest(token.trim().toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }
}
