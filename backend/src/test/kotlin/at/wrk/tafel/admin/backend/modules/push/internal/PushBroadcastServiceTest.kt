package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tools.jackson.databind.json.JsonMapper

@ExtendWith(MockKExtension::class)
internal class PushBroadcastServiceTest {

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var webPushSenderService: WebPushSenderService

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @InjectMockKs
    private lateinit var service: PushBroadcastService

    @BeforeEach
    fun beforeEach() {
        every { jsonMapper.writeValueAsString(any()) } returns "payload-json"
    }

    @Test
    fun `sends a push to every existing subscription`() {
        val subscription1 = PushSubscriptionEntity().apply { id = 10 }
        val subscription2 = PushSubscriptionEntity().apply { id = 11 }
        every { pushSubscriptionRepository.findAll() } returns listOf(subscription1, subscription2)
        every { webPushSenderService.send(any(), any()) } returns PushSendResult.SENT

        service.broadcast(title = "title", body = "body")

        verify { webPushSenderService.send(subscription1, "payload-json") }
        verify { webPushSenderService.send(subscription2, "payload-json") }
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    @Test
    fun `removes a subscription the push service reports as expired`() {
        val expiredSubscription = PushSubscriptionEntity().apply { id = 10 }
        every { pushSubscriptionRepository.findAll() } returns listOf(expiredSubscription)
        every { webPushSenderService.send(expiredSubscription, any()) } returns PushSendResult.EXPIRED

        service.broadcast(title = "title", body = "body")

        verify { pushSubscriptionRepository.delete(expiredSubscription) }
    }

    @Test
    fun `keeps a subscription the push service reports as merely failed`() {
        val failedSubscription = PushSubscriptionEntity().apply { id = 10 }
        every { pushSubscriptionRepository.findAll() } returns listOf(failedSubscription)
        every { webPushSenderService.send(failedSubscription, any()) } returns PushSendResult.FAILED

        service.broadcast(title = "title", body = "body")

        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }
}
