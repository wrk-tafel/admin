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
        every { webPushSenderService.send(any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { webPushSenderService.send(subscription1, "payload-json") }
        verify { webPushSenderService.send(subscription2, "payload-json") }
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    @Test
    fun `skips a subscription whose owner has disabled this notification type`() {
        val allowed = subscriptionOf(id = 10, userId = 100)
        val disallowed = subscriptionOf(id = 11, userId = 101)
        every { pushSubscriptionRepository.findAll() } returns listOf(allowed, disallowed)
        every { pushPreferencesService.isEnabled(100L, PushNotificationType.DISTRIBUTION_STARTED) } returns true
        every { pushPreferencesService.isEnabled(101L, PushNotificationType.DISTRIBUTION_STARTED) } returns false
        every { webPushSenderService.send(any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { webPushSenderService.send(allowed, "payload-json") }
        verify(exactly = 0) { webPushSenderService.send(disallowed, any()) }
    }

    @Test
    fun `only checks a user's preference once per broadcast even with several devices`() {
        val subscription1 = subscriptionOf(id = 10, userId = 100)
        val subscription2 = subscriptionOf(id = 11, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(subscription1, subscription2)
        every { webPushSenderService.send(any(), any()) } returns PushSendResult.SENT

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify(exactly = 1) { pushPreferencesService.isEnabled(100L, PushNotificationType.DISTRIBUTION_STARTED) }
    }

    @Test
    fun `removes a subscription the push service reports as expired`() {
        val expiredSubscription = subscriptionOf(id = 10, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(expiredSubscription)
        every { webPushSenderService.send(expiredSubscription, any()) } returns PushSendResult.EXPIRED

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify { pushSubscriptionRepository.delete(expiredSubscription) }
    }

    @Test
    fun `keeps a subscription the push service reports as merely failed`() {
        val failedSubscription = subscriptionOf(id = 10, userId = 100)
        every { pushSubscriptionRepository.findAll() } returns listOf(failedSubscription)
        every { webPushSenderService.send(failedSubscription, any()) } returns PushSendResult.FAILED

        service.broadcast(type = PushNotificationType.DISTRIBUTION_STARTED, title = "title", body = "body")

        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    @Test
    fun `sendTo sends to exactly the given subscription and reports the result`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any()) } returns PushSendResult.SENT

        val result = service.sendTo(subscription, "title", "body")

        assertThat(result).isEqualTo(PushSendResult.SENT)
        verify { webPushSenderService.send(subscription, "payload-json") }
        verify(exactly = 0) { pushSubscriptionRepository.findAll() }
    }

    @Test
    fun `sendTo ignores the owner's notification preferences`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { pushPreferencesService.isEnabled(any(), any()) } returns false
        every { webPushSenderService.send(subscription, any()) } returns PushSendResult.SENT

        service.sendTo(subscription, "title", "body")

        verify { webPushSenderService.send(subscription, "payload-json") }
    }

    @Test
    fun `sendTo removes a subscription the push service reports as expired`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any()) } returns PushSendResult.EXPIRED

        val result = service.sendTo(subscription, "title", "body")

        assertThat(result).isEqualTo(PushSendResult.EXPIRED)
        verify { pushSubscriptionRepository.delete(subscription) }
    }

    @Test
    fun `sendTo keeps a subscription when push isn't configured at all`() {
        val subscription = subscriptionOf(id = 10, userId = 100)
        every { webPushSenderService.send(subscription, any()) } returns PushSendResult.NOT_CONFIGURED

        val result = service.sendTo(subscription, "title", "body")

        assertThat(result).isEqualTo(PushSendResult.NOT_CONFIGURED)
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }
}
