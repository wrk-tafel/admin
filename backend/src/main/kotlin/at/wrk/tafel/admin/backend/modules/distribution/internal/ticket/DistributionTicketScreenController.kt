package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api")
class DistributionTicketScreenController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
        const val TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME = "ticket_screen_show_value"
        const val TICKET_SCREEN_TITLE = "Ticket"
    }

    @PostMapping("/distributions/ticket-screen/show-text")
    fun showText(@RequestBody request: TicketScreenShowText) {
        saveToOutbox(text = request.text, value = request.value)
    }

    @PostMapping("/distributions/ticket-screen/show-current")
    fun showCurrentTicket() {
        val distribution = service.getCurrentDistribution()

        val response = distribution?.let {
            val ticketNumber = service.getCurrentTicketNumber(null)?.ticketNumber
            logger.info("Ticket-Log - Fetched current ticket-number: $ticketNumber")
            ticketNumber
        }

        saveToOutbox(text = TICKET_SCREEN_TITLE, response?.toString())
    }

    @PostMapping("/distributions/ticket-screen/show-previous")
    @TafelActiveDistributionRequired
    fun showPreviousTicket() {
        val previousTicketNumber = service.reopenAndGetPreviousTicket()
        logger.info("Ticket-Log - fetched previous ticket-number: $previousTicketNumber")

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = previousTicketNumber?.toString())
    }

    @PostMapping("/distributions/ticket-screen/show-next")
    @TafelActiveDistributionRequired
    fun showNextTicket(@RequestBody request: TicketScreenShowNextTicketRequest) {
        val nextTicketNumber = service.closeCurrentTicketAndGetNext(request.costContributionPaid)
        logger.info("Ticket-Log - fetched next ticket-number: $nextTicketNumber")

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = nextTicketNumber?.toString())
    }

    @GetMapping("/sse/distributions/ticket-screen/current")
    fun listenForChanges(): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        // send initial state
        var currentTicketNumber: Int? = null
        service.getCurrentDistribution()?.let {
            currentTicketNumber = service.getCurrentTicketNumber()?.ticketNumber
        }
        val payload = TicketScreenShowText(TICKET_SCREEN_TITLE, currentTicketNumber?.toString())
        sseOutboxService.sendEvent(sseEmitter, payload)

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            resultType = TicketScreenShowText::class.java,
        )

        return sseEmitter
    }

    private fun saveToOutbox(text: String, value: String?) {
        sseOutboxService.saveOutboxEntry(
            TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            TicketScreenShowText(
                text = text,
                value = value
            )
        )
    }

}

@ExcludeFromTestCoverage
data class TicketScreenShowText(
    val text: String,
    val value: String?,
)

@ExcludeFromTestCoverage
data class TicketScreenShowNextTicketRequest(
    val costContributionPaid: Boolean
)
