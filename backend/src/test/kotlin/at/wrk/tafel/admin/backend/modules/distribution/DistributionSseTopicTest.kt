package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionUpdateResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifySequence
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionSseTopicTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var topic: DistributionSseTopic

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

            sseOutboxService.listenForNotificationEvents<Unit>(
                sseEmitter = sseEmitter,
                notificationName = "dashboard_update",
                resultType = null,
                resultCallback = any(),
            )
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
        val callback = slot<(Unit?) -> Unit>()
        every {
            sseOutboxService.listenForNotificationEvents<Unit>(any(), "dashboard_update", null, capture(callback))
        } returns Unit

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        // unrelated dashboard change: same count as already sent
        callback.captured(null)
        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, any(), "distribution") }

        // a household got registered
        val updated = DistributionUpdateResponse(distributionItem, registeredCustomers = 8)
        every { service.getCurrentDistributionUpdate() } returns updated
        callback.captured(null)
        callback.captured(null)
        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, updated, "distribution") }
    }

    @Test
    fun `a dashboard change after the distribution closed pushes nothing`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 7)
        val callback = slot<(Unit?) -> Unit>()
        every {
            sseOutboxService.listenForNotificationEvents<Unit>(any(), "dashboard_update", null, capture(callback))
        } returns Unit

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distribution = null)
        callback.captured(null)

        verify(exactly = 1) { sseOutboxService.sendEvent(sseEmitter, any(), "distribution") }
    }

    @Test
    fun `the first count of a new distribution is pushed even if it equals the last one of the previous`() {
        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distributionItem, registeredCustomers = 0)
        val callback = slot<(Unit?) -> Unit>()
        every {
            sseOutboxService.listenForNotificationEvents<Unit>(any(), "dashboard_update", null, capture(callback))
        } returns Unit

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        every { service.getCurrentDistributionUpdate() } returns DistributionUpdateResponse(distribution = null)
        callback.captured(null)
        val restarted = DistributionUpdateResponse(distributionItem, registeredCustomers = 0)
        every { service.getCurrentDistributionUpdate() } returns restarted
        callback.captured(null)

        verify(exactly = 2) { sseOutboxService.sendEvent(sseEmitter, restarted, "distribution") }
    }
}
