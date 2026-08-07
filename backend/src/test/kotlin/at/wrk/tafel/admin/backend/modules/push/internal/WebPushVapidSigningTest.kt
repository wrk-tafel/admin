package at.wrk.tafel.admin.backend.modules.push.internal

import nl.martijndwars.webpush.Encoding
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import org.assertj.core.api.Assertions.assertThat
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.junit.jupiter.api.Test
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.Security
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import org.bouncycastle.jce.interfaces.ECPrivateKey as BCECPrivateKey
import org.bouncycastle.jce.interfaces.ECPublicKey as BCECPublicKey

/**
 * Exercises the real `nl.martijndwars:web-push` VAPID signing path - unlike
 * [WebPushSenderServiceTest], which mocks [PushService] away entirely and so never runs a line of
 * the library or its dependencies.
 *
 * The point is binary compatibility of the transitive stack underneath web-push, not the header
 * format itself: web-push 5.1.2 is compiled against jose4j 0.7.9, but that version carries four
 * advisories and is pinned forward to 0.9.x in `libs.versions.toml`. A signature-incompatible bump
 * there surfaces as a `NoSuchMethodError`/`NoClassDefFoundError` out of `preparePost` - an `Error`,
 * which `WebPushSenderService.send`'s `catch (e: Exception)` deliberately does not swallow, so in
 * production it would take down the whole send rather than degrade to a FAILED result. Nothing else
 * in the suite would notice, hence this test.
 */
internal class WebPushVapidSigningTest {

    private companion object {
        const val P256_CURVE = "secp256r1"

        init {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(BouncyCastleProvider())
            }
        }
    }

    private val base64Url: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    private fun generateP256KeyPair(): KeyPair = KeyPairGenerator.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME).apply {
        initialize(ECGenParameterSpec(P256_CURVE), SecureRandom())
    }.generateKeyPair()

    /** Uncompressed point (`0x04 || X || Y`), the encoding VAPID and the `p256dh` key both use. */
    private fun encodePublicKey(keyPair: KeyPair): String = base64Url.encodeToString((keyPair.public as BCECPublicKey).q.getEncoded(false))

    private fun encodePrivateKey(keyPair: KeyPair): String = base64Url.encodeToString((keyPair.private as BCECPrivateKey).d.toByteArray())

    @Test
    fun `preparePost signs a VAPID request against the real web-push stack`() {
        val serverKeys = generateP256KeyPair()
        // Stands in for the browser's subscription keypair - only its public half ever reaches a
        // real server, which is why just the encoded point is handed to Subscription.Keys below.
        val clientKeys = generateP256KeyPair()
        val auth = ByteArray(16).also { SecureRandom().nextBytes(it) }

        val pushService = PushService(
            encodePublicKey(serverKeys),
            encodePrivateKey(serverKeys),
            "mailto:test@localhost",
        )
        val subscription = Subscription(
            "https://push.example.com/subscription-id",
            Subscription.Keys(encodePublicKey(clientKeys), base64Url.encodeToString(auth)),
        )

        val request = pushService.preparePost(
            Notification(subscription, """{"title":"test"}"""),
            Encoding.AES128GCM,
        )

        val authorization = request.getFirstHeader("Authorization").value
        // `t=` is the jose4j-signed JWT, `k=` the VAPID public key - if jose4j failed to load or
        // sign, neither would be here to assert on.
        assertThat(authorization).startsWith("vapid t=")
        assertThat(authorization).contains(", k=${encodePublicKey(serverKeys)}")
        // Three base64url segments: a real signed JWS, not an empty/unsigned placeholder.
        val jwt = authorization.removePrefix("vapid t=").substringBefore(", k=")
        assertThat(jwt.split(".")).hasSize(3).noneMatch { it.isEmpty() }
        assertThat(request.getFirstHeader("Content-Encoding").value).isEqualTo("aes128gcm")
    }
}
