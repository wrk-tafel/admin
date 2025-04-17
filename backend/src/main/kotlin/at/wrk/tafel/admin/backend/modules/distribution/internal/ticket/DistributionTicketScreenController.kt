package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
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

        saveToOutbox(text = "Ticketnummer", response?.toString())
    }

    @PostMapping("/distributions/ticket-screen/show-next")
    fun showNextTicket() {
        val nextTicketNumber = service.closeCurrentTicketAndGetNext()
        logger.info("Ticket-Log - fetched next ticket-number: $nextTicketNumber")

        saveToOutbox(text = "Ticketnummer", value = nextTicketNumber?.toString())
    }

    @GetMapping("/sse/distributions/ticket-screen/current")
    fun listenForChanges(): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        // send initial state
        var currentTicketNumber: Int? = null
        service.getCurrentDistribution()?.let {
            currentTicketNumber = service.getCurrentTicketNumber()?.ticketNumber
        }
        val payload = TicketScreenShowText("Ticketnummer", currentTicketNumber?.toString())
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
