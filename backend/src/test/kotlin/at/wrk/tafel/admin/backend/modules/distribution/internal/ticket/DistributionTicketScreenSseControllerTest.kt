package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
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

    @RelaxedMockK
    private lateinit var sseEmitterFactory: SseEmitterFactory

    @InjectMockKs
    private lateinit var controller: DistributionTicketScreenSseController

    @Test
    fun `listen for changes replays what the monitor last showed`() {
        // e.g. a start time set before the monitor was opened - the freshly connected monitor must
        // show it instead of a synthesized current ticket
        val lastShown = TicketScreenShowTextRequest(text = "Startzeit", value = "11:30")
        every {
            sseOutboxService.findLatestEvent(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
                after = any(),
            )
        } returns lastShown

        val emitter = controller.listenForChanges()

        verify { sseOutboxService.sendEvent(emitter, lastShown) }
        verify(exactly = 0) { service.getCurrentTicketNumberValue() }
    }

    @Test
    fun `listen for changes with active distribution`() {
        val testValue = TicketScreenShowTextRequest(text = "Ticket", value = "50")

        every {
            sseOutboxService.findLatestEvent(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
                after = any(),
            )
        } returns null
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

        every {
            sseOutboxService.findLatestEvent(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowTextRequest::class.java,
                after = any(),
            )
        } returns null
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
