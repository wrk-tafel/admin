package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_TITLE
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

// Stays open to every authenticated user: the fullscreen ticket monitor runs under a display
// account without permissions. The state-changing endpoints on DistributionTicketScreenController
// are restricted.
@RestController
@RequestMapping("/api/sse/distributions/ticket-screen")
class DistributionTicketScreenSseController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
    private val sseEmitterFactory: SseEmitterFactory,
) {

    @GetMapping("/current")
    fun listenForChanges(): SseEmitter {
        val sseEmitter = sseEmitterFactory.createSseEmitter()

        // send initial state
        var currentTicketNumber: Int? = null
        if (service.hasCurrentDistribution()) {
            currentTicketNumber = service.getCurrentTicketNumberValue()
        }
        val payload = TicketScreenShowTextRequest(TICKET_SCREEN_TITLE, currentTicketNumber?.toString())
        sseOutboxService.sendEvent(sseEmitter, payload)

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            resultType = TicketScreenShowTextRequest::class.java,
        )

        return sseEmitter
    }
}
