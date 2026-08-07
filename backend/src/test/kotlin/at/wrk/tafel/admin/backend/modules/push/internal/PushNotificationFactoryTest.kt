package at.wrk.tafel.admin.backend.modules.push.internal

import nl.martijndwars.webpush.Subscription
import nl.martijndwars.webpush.Urgency
import nl.martijndwars.webpush.Utils
import org.assertj.core.api.Assertions.assertThat
import org.bouncycastle.jce.interfaces.ECPublicKey
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.Security
import java.security.spec.ECGenParameterSpec
import java.util.Base64

/**
 * Unlike [WebPushSenderServiceTest], which fakes the factory away, this exercises the real one -
 * so it needs structurally valid EC key material and the BouncyCastle provider the library decodes
 * it with (registered by `WebPushConfig` at runtime, and here by hand since no Spring context is
 * involved).
 */
internal class PushNotificationFactoryTest {

    private companion object {
        private const val TOPIC = "distribution-started"
        private const val TWELVE_HOURS_IN_SECONDS = 12 * 60 * 60

        @JvmStatic
        @BeforeAll
        fun registerBouncyCastle() {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(BouncyCastleProvider())
            }
        }
    }

    private val factory = PushNotificationFactory()

    private fun realSubscription(): Subscription {
        val encoder = Base64.getUrlEncoder().withoutPadding()
        val generator = KeyPairGenerator.getInstance(Utils.ALGORITHM, BouncyCastleProvider.PROVIDER_NAME)
        generator.initialize(ECGenParameterSpec(Utils.CURVE))
        val keyPair = generator.generateKeyPair()

        val p256dhKey = encoder.encodeToString(Utils.encode(keyPair.public as ECPublicKey))
        val authKey = encoder.encodeToString(ByteArray(16).also { SecureRandom().nextBytes(it) })
        return Subscription("https://push.example.com/x", Subscription.Keys(p256dhKey, authKey))
    }

    @Test
    fun `create marks the notification urgent so FCM delivers it while the device is dozing`() {
        val notification = factory.create(realSubscription(), "{}", TOPIC)

        assertThat(notification.urgency).isEqualTo(Urgency.HIGH)
    }

    @Test
    fun `create expires the notification after twelve hours instead of the library's 28-day default`() {
        val notification = factory.create(realSubscription(), "{}", TOPIC)

        assertThat(notification.ttl).isEqualTo(TWELVE_HOURS_IN_SECONDS)
    }

    @Test
    fun `create tags the notification with the topic it was given`() {
        val notification = factory.create(realSubscription(), "{}", TOPIC)

        assertThat(notification.topic).isEqualTo(TOPIC)
    }

    @Test
    fun `create carries the subscription endpoint and payload`() {
        val subscription = realSubscription()

        val notification = factory.create(subscription, """{"notification":{"title":"x"}}""", TOPIC)

        assertThat(notification.endpoint).isEqualTo(subscription.endpoint)
        assertThat(notification.payload).isEqualTo("""{"notification":{"title":"x"}}""".toByteArray())
    }
}
