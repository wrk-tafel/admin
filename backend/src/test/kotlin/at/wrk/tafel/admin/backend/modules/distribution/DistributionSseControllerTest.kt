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
import io.mockk.verifySequence
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionSseControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var controller: DistributionSseController

    @Test
    fun `listen for distribution updates with active distribution`() {
        val distributionItem = DistributionItem(
            id = 123,
            startedAt = LocalDateTime.now(),
            endedAt = null,
        )
        every { service.getCurrentDistributionItem() } returns distributionItem

        val sseEmitter = controller.listenForDistributionUpdates()
        assertThat(sseEmitter).isNotNull

        verifySequence {
            sseOutboxService.sendEvent(
                sseEmitter,
                DistributionUpdateResponse(distribution = distributionItem),
            )

            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionUpdateResponse::class.java,
            )
        }
    }

    @Test
    fun `listen for distribution updates without active distribution`() {
        every { service.getCurrentDistributionItem() } returns null

        val sseEmitter = controller.listenForDistributionUpdates()
        assertThat(sseEmitter).isNotNull

        verifySequence {
            sseOutboxService.sendEvent(
                sseEmitter,
                DistributionUpdateResponse(
                    distribution = null,
                ),
            )

            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
                resultType = DistributionUpdateResponse::class.java,
            )
        }
    }
}
