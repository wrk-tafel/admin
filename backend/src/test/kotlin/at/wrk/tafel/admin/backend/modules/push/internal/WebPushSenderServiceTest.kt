package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import io.mockk.every
import io.mockk.mockk
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import org.apache.http.HttpResponse
import org.apache.http.StatusLine
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

    private fun mockResponse(statusCode: Int): HttpResponse {
        val statusLine = mockk<StatusLine>()
        every { statusLine.statusCode } returns statusCode
        val response = mockk<HttpResponse>()
        every { response.statusLine } returns statusLine
        return response
    }

    @Test
    fun `send skips and reports FAILED when push isn't configured`() {
        val service = WebPushSenderService(pushService = null, notificationFactory = notificationFactory)

        val result = service.send(testSubscription, "{}")

        assertThat(result).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `send reports SENT on a 2xx response`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.send(fakeNotification) } returns mockResponse(201)
        val service = WebPushSenderService(pushService, notificationFactory)

        val result = service.send(testSubscription, "{}")

        assertThat(result).isEqualTo(PushSendResult.SENT)
    }

    @Test
    fun `send reports EXPIRED on a 404 response`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.send(fakeNotification) } returns mockResponse(404)
        val service = WebPushSenderService(pushService, notificationFactory)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `send reports EXPIRED on a 410 response`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.send(fakeNotification) } returns mockResponse(410)
        val service = WebPushSenderService(pushService, notificationFactory)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.EXPIRED)
    }

    @Test
    fun `send reports FAILED on an unexpected status code`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.send(fakeNotification) } returns mockResponse(500)
        val service = WebPushSenderService(pushService, notificationFactory)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }

    @Test
    fun `send reports FAILED when the push library throws`() {
        every { notificationFactory.create(any<Subscription>(), "{}") } returns fakeNotification
        val pushService = mockk<PushService>()
        every { pushService.send(fakeNotification) } throws IllegalStateException("boom")
        val service = WebPushSenderService(pushService, notificationFactory)

        assertThat(service.send(testSubscription, "{}")).isEqualTo(PushSendResult.FAILED)
    }
}
