package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_TITLE
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

// Stays open to every authenticated user (no `requiredAuthorities`): the fullscreen ticket monitor
// runs under a display account without permissions. The state-changing endpoints on
// DistributionTicketScreenController are restricted.
@Component
class TicketScreenSseTopic(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    override val name = "ticket-screen"

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        sseOutboxService.sendEvent(emitter, initialState(), name)

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = emitter,
            notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            resultType = TicketScreenShowTextRequest::class.java,
            eventName = name,
        )
    }

    /**
     * What a freshly connected monitor shows until the next event arrives: the value the operator
     * last put on the screen - e.g. a start time set before the monitor was even opened - not a
     * synthesized "current ticket". Replayed from the outbox, bounded at the previous
     * distribution's end so a monitor opened on a new distribution day never resurrects a ticket
     * number from the last one (outbox rows live for the whole retention). Only when nothing was
     * shown since then does the current ticket serve as the fallback.
     */
    private fun initialState(): TicketScreenShowTextRequest {
        val lastShown = sseOutboxService.findLatestEvent(
            notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            resultType = TicketScreenShowTextRequest::class.java,
            after = service.getLastEndedDistributionTime(),
        )
        if (lastShown != null) {
            return lastShown
        }

        val currentTicketNumber = if (service.hasCurrentDistribution()) service.getCurrentTicketNumberValue() else null
        return TicketScreenShowTextRequest(TICKET_SCREEN_TITLE, currentTicketNumber?.toString())
    }
}
