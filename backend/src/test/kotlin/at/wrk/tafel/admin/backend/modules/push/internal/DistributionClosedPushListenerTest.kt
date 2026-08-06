package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import tools.jackson.databind.json.JsonMapper

@ExtendWith(MockKExtension::class)
internal class DistributionClosedPushListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @RelaxedMockK
    private lateinit var webPushSenderService: WebPushSenderService

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    private lateinit var listener: DistributionClosedPushListener

    @BeforeEach
    fun beforeEach() {
        listener = DistributionClosedPushListener(
            distributionRepository,
            userRepository,
            pushSubscriptionRepository,
            webPushSenderService,
            jsonMapper,
        )

        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns testDistributionEntity
        every { jsonMapper.writeValueAsString(any()) } returns "payload-json"
    }

    @Test
    fun `unknown distribution id is a no-op`() {
        every { distributionRepository.findByIdOrNull(any()) } returns null

        listener.onDistributionClosed(DistributionClosedEvent(distributionId = 999L))

        verify(exactly = 0) { userRepository.findAllByAuthoritiesNameInAndEnabledTrue(any()) }
    }

    @Test
    fun `queries users with LEADERSHIP permissions and sends a push to every one of their subscriptions`() {
        val leadershipUser1 = UserEntity().apply { id = 1 }
        val leadershipUser2 = UserEntity().apply { id = 2 }
        every {
            userRepository.findAllByAuthoritiesNameInAndEnabledTrue(
                match { it.containsAll(listOf("USER_MANAGEMENT", "SETTINGS", "SUPERVISOR")) && it.size == 3 },
            )
        } returns listOf(leadershipUser1, leadershipUser2)

        val subscription1 = PushSubscriptionEntity().apply { id = 10 }
        val subscription2 = PushSubscriptionEntity().apply { id = 11 }
        every { pushSubscriptionRepository.findAllByUserId(1L) } returns listOf(subscription1)
        every { pushSubscriptionRepository.findAllByUserId(2L) } returns listOf(subscription2)
        every { webPushSenderService.send(any(), any()) } returns PushSendResult.SENT

        listener.onDistributionClosed(DistributionClosedEvent(distributionId = testDistributionEntity.id!!))

        verify { webPushSenderService.send(subscription1, "payload-json") }
        verify { webPushSenderService.send(subscription2, "payload-json") }
        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }

    @Test
    fun `removes a subscription the push service reports as expired`() {
        val user = UserEntity().apply { id = 1 }
        every { userRepository.findAllByAuthoritiesNameInAndEnabledTrue(any()) } returns listOf(user)

        val expiredSubscription = PushSubscriptionEntity().apply { id = 10 }
        every { pushSubscriptionRepository.findAllByUserId(1L) } returns listOf(expiredSubscription)
        every { webPushSenderService.send(expiredSubscription, any()) } returns PushSendResult.EXPIRED

        listener.onDistributionClosed(DistributionClosedEvent(distributionId = testDistributionEntity.id!!))

        verify { pushSubscriptionRepository.delete(expiredSubscription) }
    }

    @Test
    fun `keeps a subscription the push service reports as merely failed`() {
        val user = UserEntity().apply { id = 1 }
        every { userRepository.findAllByAuthoritiesNameInAndEnabledTrue(any()) } returns listOf(user)

        val failedSubscription = PushSubscriptionEntity().apply { id = 10 }
        every { pushSubscriptionRepository.findAllByUserId(1L) } returns listOf(failedSubscription)
        every { webPushSenderService.send(failedSubscription, any()) } returns PushSendResult.FAILED

        listener.onDistributionClosed(DistributionClosedEvent(distributionId = testDistributionEntity.id!!))

        verify(exactly = 0) { pushSubscriptionRepository.delete(any()) }
    }
}
