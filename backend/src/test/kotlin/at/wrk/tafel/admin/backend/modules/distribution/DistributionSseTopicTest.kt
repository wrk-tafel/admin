package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseSharedSnapshot
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionUpdateResponse
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import io.mockk.verifySequence
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.time.LocalDateTime
import java.util.concurrent.Executor

@ExtendWith(MockKExtension::class)
internal class DistributionSseTopicTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    private lateinit var topic: DistributionSseTopic

    private lateinit var registrationUpdate: SseSharedSnapshot<DistributionUpdateResponse>

    @BeforeEach
    fun beforeEach() {
        every { sseOutboxService.sharedSnapshot<DistributionUpdateResponse>("dashboard_update", any()) } answers {
            SseSharedSnapshot(firstArg(), Executor { it.run() }, secondArg<() -> DistributionUpdateResponse>())
                .also { registrationUpdate = it }
        }
        every { sseOutboxService.listenForSharedSnapshot<DistributionUpdateResponse>(any(), any(), any()) } answers {
            secondArg<SseSharedSnapshot<DistributionUpdateResponse>>().subscribe(thirdArg())
        }
        topic = DistributionSseTopic(service, sseOutboxService)
        clearMocks(sseOutboxService, answers = false)
    }

    private val distributionItem = DistributionItem(
        id = 123,
        startedAt = LocalDateTime.now(),
        endedAt = null,
    )

    @Test
    fun `listen for distribution updates with active distribution`() {
        val update = DistributionUpdateResponse(distribution = distributionItem, registeredCustomers = 7)
        every { service.getCurrentDistributionUpdate() } returns update

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        verifySequence {
            sseOutboxService.sendEvent(sseEmitter, update, "distribution")

            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionUpdateResponse::class.java,
                eventName = "distribution",
            )

            sseOutboxService.listenForSharedSnapshot(sseEmitter, registrationUpdate, any())
        }
    }

    @Test
    fun `listen for distribution updates without active distribution`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distribution = null)

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        verify {
            sseOutboxService.sendEvent(sseEmitter, DistributionUpdateResponse(distribution = null), "distribution")
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionUpdateResponse::class.java,
                eventName = "distribution",
            )
        }
    }

    @Test
    fun `a registration change is pushed only when the registered count changed`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 7)
        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        // unrelated dashboard change: same count as already sent
        registrationUpdate.changed()
        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, any(), "distribution") }

        // a household got registered
        val updated = DistributionUpdateResponse(distributionItem, registeredCustomers = 8)
        every { service.getCurrentDistributionUpdate() } returns updated
        registrationUpdate.changed()
        registrationUpdate.changed()
        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, updated, "distribution") }
    }

    @Test
    fun `a dashboard change after the distribution closed pushes nothing`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 7)
        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distribution = null)
        registrationUpdate.changed()

        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, any(), "distribution") }
    }

    @Test
    fun `the first count of a new distribution is pushed even if it equals the last one of the previous`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 0)
        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distribution = null)
        registrationUpdate.changed()
        val restarted = DistributionUpdateResponse(distributionItem, registeredCustomers = 0)
        every { service.getCurrentDistributionUpdate() } returns restarted
        registrationUpdate.changed()

        verify(exactly = 2) { sseOutboxService.sendEvent(sseEmitter, restarted, "distribution") }
    }

    @Test
    fun `the registration update is read once per change for all open tabs`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 7)
        val emitters = List(3) { mockk<SseEmitter>(relaxed = true) }
        emitters.forEach { topic.subscribe(it, null) }
        val updated = DistributionUpdateResponse(distributionItem, registeredCustomers = 8)
        every { service.getCurrentDistributionUpdate() } returns updated

        registrationUpdate.changed()

        // three initial reads, one for the change
        verify(exactly = 4) { service.getCurrentDistributionUpdate() }
        emitters.forEach { verify(exactly = 1) { sseOutboxService.sendEvent(it, updated, "distribution") } }
    }
}
