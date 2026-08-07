package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tools.jackson.databind.json.JsonMapper

@ExtendWith(MockKExtension::class)
internal class PushBroadcastServiceTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var pushPreferencesService: PushPreferencesService

    @RelaxedMockK
    private lateinit var webPushSenderService: WebPushSenderService

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @InjectMockKs
    private lateinit var service: PushBroadcastService

    @BeforeEach
    fun beforeEach() {
        every { jsonMapper.writeValueAsString(any()) } returns "payload-json"
        every { pushPreferencesService.isEnabled(any(), any()) } returns true
    }

    private fun subscriptionOf(id: Long, userId: Long) = PushSubscriptionEntity().apply {
        this.id = id
        user = UserEntity(
            username = "user-$userId",
            password = "pw",
            employee = EmployeeEntity(personnelNumber = "p-$userId", firstname = "first", lastname = "last"),
        ).apply { this.id = userId }
    }

    @Test
    fun `sends a push to every subscription whose owner allows this notification type`() {
        val subscription1 = subscriptionOf(id = 10, userId = 100)
        val subscription2 = subscriptionOf(id = 11, userId = 101)
        every { pushSubscriptionRepository.findAll() } returns listOf(subscription1, subscription2)
        every { webPushSenderService.send(any(), any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { webPushSenderService.send(subscription1, "payload-json", any()) }
        verify { webPushSenderService.send(subscription2, "payload-json", any()) }
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    /**
     * The topic is what makes the push service replace an undelivered notification instead of
     * queueing another one behind it, so each type has to get its own - two types sharing one topic
     * would silently swallow the other's pending notification on an unreachable device.
     */
    @Test
    fun `broadcast queues each notification type under its own topic`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(subscription)
        every { webPushSenderService.send(any(), any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")
        service.broadcast(type = PushNotificationType.DISTRIBUTION_CLOSED, title = "title", body = "body")

        verify { webPushSenderService.send(subscription, any(), "distribution-started") }
        verify { webPushSenderService.send(subscription, any(), "distribution-closed") }
    }

    @Test
    fun `skips a subscription whose owner has disabled this notification type`() {
        val allowed = subscriptionOf(id = 10, userId = 100)
        val disallowed = subscriptionOf(id = 11, userId = 101)
        every { pushSubscriptionRepository.findAll() } returns listOf(allowed, disallowed)
        every { pushPreferencesService.isEnabled(100L, PushNotificationType.DISTRIBUTION_STARTED) } returns true
        every { pushPreferencesService.isEnabled(101L, PushNotificationType.DISTRIBUTION_STARTED) } returns false
        every { webPushSenderService.send(any(), any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { webPushSenderService.send(allowed, "payload-json", any()) }
        verify(exactly = 0) { webPushSenderService.send(disallowed, any(), any()) }
    }

    @Test
    fun `only checks a user's preference once per broadcast even with several devices`() {
        val subscription1 = subscriptionOf(id = 10, userId = 100)
        val subscription2 = subscriptionOf(id = 11, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(subscription1, subscription2)
        every { webPushSenderService.send(any(), any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify(exactly = 1) { pushPreferencesService.isEnabled(100L, PushNotificationType.DISTRIBUTION_STARTED) }
    }

    @Test
    fun `removes a subscription the push service reports as expired`() {
        val expiredSubscription = subscriptionOf(id = 10, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(expiredSubscription)
        every { webPushSenderService.send(expiredSubscription, any(), any()) } returns PushSendResult.EXPIRED

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { pushSubscriptionRepository.delete(expiredSubscription) }
    }

    @Test
    fun `keeps a subscription the push service reports as merely failed`() {
        val failedSubscription = subscriptionOf(id = 10, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(failedSubscription)
        every { webPushSenderService.send(failedSubscription, any(), any()) } returns PushSendResult.FAILED

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    @Test
    fun `sendTo sends to exactly the given subscription and reports the result`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any(), any()) } returns PushSendResult.SENT

        val result = service.sendTo(subscription, "title", "body", "test")

        assertThat(result).isEqualTo(PushSendResult.SENT)
        verify { webPushSenderService.send(subscription, "payload-json", any()) }
        verify(exactly = 0) { pushSubscriptionRepository.findAll() }
    }

    @Test
    fun `sendTo ignores the owner's notification preferences`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { pushPreferencesService.isEnabled(any(), any()) } returns false
        every { webPushSenderService.send(subscription, any(), any()) } returns PushSendResult.SENT

        service.sendTo(subscription, "title", "body", "test")

        verify { webPushSenderService.send(subscription, "payload-json", any()) }
    }

    @Test
    fun `sendTo removes a subscription the push service reports as expired`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any(), any()) } returns PushSendResult.EXPIRED

        val result = service.sendTo(subscription, "title", "body", "test")

        assertThat(result).isEqualTo(PushSendResult.EXPIRED)
        verify { pushSubscriptionRepository.delete(subscription) }
    }

    /**
     * Every other test here mocks the mapper away, which leaves the one thing the browser actually
     * reads - the payload's shape - unasserted. The icon paths in particular are only ever resolved
     * at display time on the device, so a wrong or missing one shows up as a notification without
     * any Tafel branding rather than as any kind of error. The literal paths are pinned here on
     * purpose: the files themselves live in the frontend
     * (`frontend/src/main/webapp/public/icons/`), so nothing but this assertion connects the two
     * sides.
     */
    @Test
    fun `payload carries title, body and both notification icons`() {
        val realMapper = JsonMapper.builder().build()
        val serviceWithRealMapper = PushBroadcastService(
            pushSubscriptionRepository,
            pushPreferencesService,
            webPushSenderService,
            realMapper,
        )
        val subscription = subscriptionOf(id = 10, userId = 100)
        val payload = slot<String>()
        every { webPushSenderService.send(subscription, capture(payload), any()) } returns PushSendResult.SENT

        serviceWithRealMapper.sendTo(subscription, "Ausgabe beendet", "Die Ausgabe wurde soeben beendet.", "distribution-closed")

        val notification = realMapper.readTree(payload.captured)["notification"]
        assertThat(notification["title"].asString()).isEqualTo("Ausgabe beendet")
        assertThat(notification["body"].asString()).isEqualTo("Die Ausgabe wurde soeben beendet.")
        assertThat(notification["icon"].asString()).isEqualTo("/icons/icon-192x192.png")
        assertThat(notification["badge"].asString()).isEqualTo("/icons/badge-96x96.png")
    }

    @Test
    fun `sendTo keeps a subscription when push isn't configured at all`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any(), any()) } returns PushSendResult.NOT_CONFIGURED

        val result = service.sendTo(subscription, "title", "body", "test")

        assertThat(result).isEqualTo(PushSendResult.NOT_CONFIGURED)
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }
}
