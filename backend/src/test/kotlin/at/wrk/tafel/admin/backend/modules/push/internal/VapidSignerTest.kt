package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminPushProperties
import io.jsonwebtoken.Jwts
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.net.URI
import java.security.KeyPair
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.time.Instant
import java.util.Base64

internal class VapidSignerTest {

    private val serverKeys: KeyPair = WebPushEcKeys.generateKeyPair()
    private val publicKey = WebPushEcKeys.encodeBase64Url(WebPushEcKeys.encodePublicKey(serverKeys.public as ECPublicKey))
    private val privateKey = WebPushEcKeys.encodeBase64Url((serverKeys.private as ECPrivateKey).s.toByteArray())

    private fun signerWith(
        vapidPublicKey: String? = publicKey,
        vapidPrivateKey: String? = privateKey,
        vapidSubject: String? = "mailto:test@localhost",
    ) = VapidSigner(
        TafelAdminProperties(
            push = TafelAdminPushProperties(
                vapidPublicKey = vapidPublicKey,
                vapidPrivateKey = vapidPrivateKey,
                vapidSubject = vapidSubject,
            ),
        ),
    )

    @Test
    fun `isn't configured when push isn't configured at all`() {
        assertThat(VapidSigner(TafelAdminProperties(push = null)).isConfigured).isFalse()
    }

    @Test
    fun `isn't configured when the public key is missing`() {
        assertThat(signerWith(vapidPublicKey = null).isConfigured).isFalse()
    }

    @Test
    fun `isn't configured when the private key is missing`() {
        assertThat(signerWith(vapidPrivateKey = null).isConfigured).isFalse()
    }

    @Test
    fun `isn't configured when the subject is missing`() {
        assertThat(signerWith(vapidSubject = null).isConfigured).isFalse()
    }

    @Test
    fun `isn't configured when a value is blank rather than absent`() {
        assertThat(signerWith(vapidSubject = "  ").isConfigured).isFalse()
    }

    /**
     * A mistyped key stays a push problem instead of becoming a boot failure - see [VapidSigner].
     */
    @Test
    fun `isn't configured when the key material can't be decoded`() {
        assertThat(signerWith(vapidPublicKey = "not-a-key").isConfigured).isFalse()
    }

    @Test
    fun `isn't configured when the public key isn't an uncompressed P-256 point`() {
        assertThat(signerWith(vapidPublicKey = WebPushEcKeys.encodeBase64Url(ByteArray(32))).isConfigured).isFalse()
    }

    @Test
    fun `refuses to sign when it isn't configured`() {
        assertThatThrownBy { VapidSigner(TafelAdminProperties(push = null)).authorizationHeader(URI.create("https://push.example.com/x")) }
            .isInstanceOf(IllegalStateException::class.java)
    }

    @Test
    fun `builds a vapid authorization header carrying the token and the public key`() {
        val header = signerWith().authorizationHeader(URI.create("https://push.example.com/subscription-id"))

        assertThat(header).startsWith("vapid t=")
        assertThat(header).endsWith(", k=$publicKey")
    }

    @Test
    fun `signs the token with the configured private key`() {
        val header = signerWith().authorizationHeader(URI.create("https://push.example.com/subscription-id"))

        // Parsing verifies the ES256 signature against the public half - a token signed with
        // anything else, or left unsigned, doesn't get past this.
        val claims = Jwts.parser().verifyWith(serverKeys.public as ECPublicKey).build()
            .parseSignedClaims(tokenOf(header)).payload

        assertThat(claims.subject).isEqualTo("mailto:test@localhost")
        assertThat(claims.audience).containsExactly("https://push.example.com")
        assertThat(claims.expiration.toInstant())
            .isAfter(Instant.now())
            .isBefore(Instant.now().plusSeconds(24 * 60 * 60))
    }

    /**
     * RFC 8292's `aud` is a single origin string. jjwt models the claim as a set, so this pins down
     * that it still serializes as a bare string - an array would be a valid JWT but is not what
     * push services accept.
     */
    @Test
    fun `writes the audience as a plain origin string`() {
        val header = signerWith().authorizationHeader(URI.create("https://push.example.com:8443/subscription-id"))

        assertThat(payloadJsonOf(tokenOf(header)))
            .contains(""""aud":"https://push.example.com:8443"""")
            .contains(""""sub":"mailto:test@localhost"""")
    }

    @Test
    fun `keeps the subscription's path out of the token`() {
        val header = signerWith().authorizationHeader(URI.create("https://push.example.com/secret-subscription-id"))

        assertThat(payloadJsonOf(tokenOf(header))).doesNotContain("secret-subscription-id")
    }

    @Test
    fun `declares the JWT type in the token header`() {
        val header = signerWith().authorizationHeader(URI.create("https://push.example.com/x"))

        val joseHeader = String(Base64.getUrlDecoder().decode(tokenOf(header).substringBefore(".")), Charsets.UTF_8)
        assertThat(joseHeader).contains(""""typ":"JWT"""").contains(""""alg":"ES256"""")
    }

    /**
     * A raw private key whose leading bit is set exports as 33 bytes via `BigInteger.toByteArray()`
     * and as 32 the way the openssl recipe in `TafelAdminPushProperties` produces it. Both encode
     * the same scalar, so both have to load.
     */
    @Test
    fun `accepts a private key with or without a leading sign byte`() {
        val exported = (serverKeys.private as ECPrivateKey).s.toByteArray()
        val bare32Bytes = ByteArray(32).also { padded ->
            val source = exported.takeLast(32)
            source.forEachIndexed { index, byte -> padded[padded.size - source.size + index] = byte }
        }

        assertThat(signerWith(vapidPrivateKey = WebPushEcKeys.encodeBase64Url(exported)).isConfigured).isTrue()
        assertThat(signerWith(vapidPrivateKey = WebPushEcKeys.encodeBase64Url(bare32Bytes)).isConfigured).isTrue()
        assertThat(signerWith(vapidPrivateKey = WebPushEcKeys.encodeBase64Url(ByteArray(1) + bare32Bytes)).isConfigured).isTrue()
    }

    private fun tokenOf(header: String) = header.removePrefix("vapid t=").substringBefore(", k=")

    private fun payloadJsonOf(token: String) = String(Base64.getUrlDecoder().decode(token.split(".")[1]), Charsets.UTF_8)
}
