package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import nl.martijndwars.webpush.Encoding
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import org.apache.http.StatusLine
import org.apache.http.client.methods.CloseableHttpResponse
import org.apache.http.client.methods.HttpPost
import org.apache.http.client.methods.HttpUriRequest
import org.apache.http.impl.client.CloseableHttpClient
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class WebPushSenderServiceTest {

    // Plain placeholder strings - real EC key material isn't needed here, since
    // PushNotificationFactory (mocked below) is what would normally decode it, and this test
    // never calls the real one.
    private val testSubscription = PushSubscriptionEntity().apply {
        id = 1
        endpoint = "https://push.example.com/x"
        p256dhKey = "test-p256dh"
        authKey = "test-auth"
    }

    private val notificationFactory = mockk<PushNotificationFactory>()
    private val fakeNotification = mockk<Notification>()
    private val httpClient = mockk<CloseableHttpClient>()

    private fun mockResponse(statusCode: Int): CloseableHttpResponse {
        val statusLine = mockk<StatusLine>()
        every { statusLine.statusCode } returns statusCode
        val response = mockk<CloseableHttpResponse>(relaxed = true)
        every { response.statusLine } returns statusLine
        return response
    }

    /**
     * A real [HttpPost] rather than a mock, so the `Crypto-Key` header removal below is asserted
     * against actual header handling instead of a recorded call.
     */
    private fun serviceRespondingWith(statusCode: Int, request: HttpPost = HttpPost("https://push.example.com/x")): WebPushSenderService {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.preparePost(fakeNotification, any()) } returns request
        every { httpClient.execute(any<HttpUriRequest>()) } returns mockResponse(statusCode)
        return WebPushSenderService(pushService, notificationFactory, httpClient)
    }

    @Test
    fun `send skips and reports NOT_CONFIGURED when push isn't configured`() {
        val service = WebPushSenderService(pushService = null, notificationFactory = notificationFactory, httpClient = httpClient)

        val result = service.send(testSubscription, "{}")

        assertThat(result).isEqualTo(PushSendResult.NOT_CONFIGURED)
        verify(exactly = 0) { httpClient.execute(any<HttpUriRequest>()) }
    }

    @Test
    fun `send reports SENT on a 2xx response`() {
        val service = serviceRespondingWith(201)

        val result = service.send(testSubscription, "{}")

        assertThat(result).isEqualTo(PushSendResult.SENT)
    }

    @Test
    fun `send requests the aes128gcm encoding`() {
        val encoding = slot<Encoding>()
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.preparePost(fakeNotification, capture(encoding)) } returns HttpPost("https://push.example.com/x")
        every { httpClient.execute(any<HttpUriRequest>()) } returns mockResponse(201)

        WebPushSenderService(pushService, notificationFactory, httpClient).send(testSubscription, "{}")

        assertThat(encoding.captured).isEqualTo(Encoding.AES128GCM)
    }

    @Test
    fun `send drops the library's padded Crypto-Key header, which FCM rejects`() {
        val request = HttpPost("https://push.example.com/x")
        request.setHeader("Crypto-Key", "p256ecdsa=BKmPGeVXrI8Zy6rTjVTpoQEODmhImq4=")
        val service = serviceRespondingWith(201, request)

        service.send(testSubscription, "{}")

        assertThat(request.getHeaders("Crypto-Key")).isEmpty()
    }

    @Test
    fun `send reports EXPIRED on a 403 response`() {
        assertThat(serviceRespondingWith(403).send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `send reports EXPIRED on a 404 response`() {
        assertThat(serviceRespondingWith(404).send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `send reports EXPIRED on a 410 response`() {
        assertThat(serviceRespondingWith(410).send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `send reports FAILED on an unexpected status code`() {
        assertThat(serviceRespondingWith(500).send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `send reports FAILED when the push library throws`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.preparePost(fakeNotification, any()) } throws IllegalStateException("boom")
        val service = WebPushSenderService(pushService, notificationFactory, httpClient)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `send reports FAILED when the request itself throws`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.preparePost(fakeNotification, any()) } returns HttpPost("https://push.example.com/x")
        every { httpClient.execute(any<HttpUriRequest>()) } throws java.io.IOException("no route to host")
        val service = WebPushSenderService(pushService, notificationFactory, httpClient)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }
}
