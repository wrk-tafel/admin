package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class DistributionTicketScreenSseControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var controller: DistributionTicketScreenSseController

    @Test
    fun `listen for changes with active distribution`() {
        val testValue = TicketScreenShowTextRequest(text = "Ticket", value = "50")

        every { service.hasCurrentDistribution() } returns true
        every { service.getCurrentTicketNumberValue() } returns 50

        val emitter = controller.listenForChanges()
        assertThat(emitter).isNotNull

        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
            )
        }

        verify { sseOutboxService.sendEvent(emitter, testValue) }
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
            )
        }
    }

    @Test
    fun `listen for changes without active distribution`() {
        val testValue = TicketScreenShowTextRequest(text = "Ticket", value = null)

        every { service.hasCurrentDistribution() } returns false

        val emitter = controller.listenForChanges()
        assertThat(emitter).isNotNull

        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
            )
        }

        verify { sseOutboxService.sendEvent(emitter, testValue) }
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
            )
        }
    }
}
