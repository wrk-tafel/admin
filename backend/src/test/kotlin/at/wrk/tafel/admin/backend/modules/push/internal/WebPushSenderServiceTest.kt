package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.ExpectedCount
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.web.client.RestClient
import java.net.URI
import java.time.Duration

/**
 * Covers how a push service's answer is turned into a [PushSendResult]. The signing and encryption
 * collaborators are mocked here on purpose - [WebPushVapidSigningTest] is what exercises the real
 * ones end to end.
 */
internal class WebPushSenderServiceTest {

    private val pushEndpoint = "https://push.example.com/subscription-id"

    private val testSubscription = PushSubscriptionEntity().apply {
        id = 1
        endpoint = pushEndpoint
        p256dhKey = "test-p256dh"
        authKey = "test-auth"
    }

    private val vapidSigner = mockk<VapidSigner>()
    private val encryptionService = mockk<WebPushEncryptionService>()

    private val tafelAdminProperties = TafelAdminProperties()

    private val restClientBuilder = RestClient.builder()
    private val mockServer = MockRestServiceServer.bindTo(restClientBuilder).build()
    private val service = WebPushSenderService(vapidSigner, encryptionService, tafelAdminProperties, restClientBuilder.build())

    private fun configuredSigner() {
        every { vapidSigner.isConfigured } returns true
        every { vapidSigner.authorizationHeader(any()) } returns "vapid t=token, k=key"
        every { encryptionService.encrypt(any(), any(), any()) } returns byteArrayOf(1, 2, 3)
    }

    private fun expectRequestRespondingWith(status: HttpStatus, body: String = "") {
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andRespond(withStatus(status).body(body))
    }

    @Test
    fun `skips and reports NOT_CONFIGURED when VAPID isn't configured`() {
        every { vapidSigner.isConfigured } returns false

        val result = service.send(testSubscription, "{}")

        assertThat(result).isEqualTo(PushSendResult.NOT_CONFIGURED)
        mockServer.verify()
        verify(exactly = 0) { encryptionService.encrypt(any(), any(), any()) }
    }

    @Test
    fun `posts the encrypted payload with the vapid and aes128gcm headers`() {
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "vapid t=token, k=key"))
            .andExpect(header(HttpHeaders.CONTENT_ENCODING, "aes128gcm"))
            .andExpect(header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE))
            .andRespond(withStatus(HttpStatus.CREATED))

        val result = service.send(testSubscription, """{"title":"test"}""")

        assertThat(result).isEqualTo(PushSendResult.SENT)
        mockServer.verify()
        verify { encryptionService.encrypt("test-p256dh", "test-auth", """{"title":"test"}""".toByteArray()) }
        // The endpoint's origin is what ends up in the token's audience, so the signer needs the
        // full endpoint rather than just the host.
        verify { vapidSigner.authorizationHeader(URI.create(pushEndpoint)) }
    }

    @Test
    fun `marks the message urgent so FCM delivers it while the device is dozing`() {
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andExpect(header("Urgency", "high"))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.send(testSubscription, "{}")

        mockServer.verify()
    }

    @Test
    fun `expires the message after twelve hours rather than letting it queue for weeks`() {
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andExpect(header("TTL", "43200"))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.send(testSubscription, "{}")

        mockServer.verify()
    }

    /**
     * Both are configuration, not constants: how long a message may wait and how hard it pushes
     * against the device's battery is the kind of thing that gets re-tuned while a distribution is
     * running, when notifications are turning out to arrive late.
     */
    @Test
    fun `the configured lifetime and urgency are what is sent`() {
        tafelAdminProperties.pushDelivery.ttl = Duration.ofMinutes(30)
        tafelAdminProperties.pushDelivery.urgency = "normal"
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andExpect(header("TTL", "1800"))
            .andExpect(header("Urgency", "normal"))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.send(testSubscription, "{}")

        mockServer.verify()
    }

    /**
     * A topic becomes FCM's collapse key, and collapsible messages are rate-limited per app, device
     * and collapse key - so setting one makes repeated notifications stop arriving instead of
     * merely replacing each other (see [WebPushSenderService.send]).
     */
    @Test
    fun `sends no topic so the push service doesn't collapse notifications`() {
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andExpect(headerDoesNotExist("Topic"))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.send(testSubscription, "{}")

        mockServer.verify()
    }

    @Test
    fun `reports SENT on a 2xx response`() {
        configuredSigner()
        expectRequestRespondingWith(HttpStatus.OK)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.SENT)
    }

    @Test
    fun `reports EXPIRED on a 403 response`() {
        configuredSigner()
        expectRequestRespondingWith(HttpStatus.FORBIDDEN, "sender ID mismatch")

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `reports EXPIRED on a 404 response`() {
        configuredSigner()
        expectRequestRespondingWith(HttpStatus.NOT_FOUND)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `reports EXPIRED on a 410 response`() {
        configuredSigner()
        expectRequestRespondingWith(HttpStatus.GONE, "UnauthorizedRegistration")

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `reports FAILED on an unexpected status code`() {
        configuredSigner()
        expectRequestRespondingWith(HttpStatus.INTERNAL_SERVER_ERROR)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `reports FAILED when encryption throws`() {
        every { vapidSigner.isConfigured } returns true
        every { encryptionService.encrypt(any(), any(), any()) } throws IllegalArgumentException("bad key")

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
        mockServer.verify()
    }

    @Test
    fun `reports FAILED when the request itself throws`() {
        configuredSigner()
        mockServer.expect(ExpectedCount.once(), requestTo(pushEndpoint))
            .andRespond { throw java.io.IOException("no route to host") }

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `reports FAILED when the subscription is missing its key material`() {
        every { vapidSigner.isConfigured } returns true
        val incomplete = PushSubscriptionEntity().apply {
            id = 2
            endpoint = pushEndpoint
        }

        assertThat(service.send(incomplete, "{}")).isEqualTo(PushSendResult.FAILED)
        mockServer.verify()
    }
}
