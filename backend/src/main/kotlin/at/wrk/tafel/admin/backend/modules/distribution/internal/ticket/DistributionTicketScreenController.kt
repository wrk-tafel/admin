package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.slf4j.LoggerFactory
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions/ticket-screen")
class DistributionTicketScreenController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
        const val TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME = "ticket_screen_show_value"
        const val TICKET_SCREEN_TITLE = "Ticket"
    }

    @PostMapping("/show-text")
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showText(@Valid @RequestBody request: TicketScreenShowText) {
        saveToOutbox(text = request.text, value = request.value)
    }

    @PostMapping("/show-current")
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showCurrentTicket() {
        val response = if (service.hasCurrentDistribution()) {
            val ticketNumber = service.getCurrentTicketNumberValue()
            logger.info("Ticket-Log - Fetched current ticket-number: $ticketNumber")
            ticketNumber
        } else {
            null
        }

        saveToOutbox(text = TICKET_SCREEN_TITLE, response?.toString())
    }

    @PostMapping("/show-previous")
    @TafelActiveDistributionRequired
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showPreviousTicket() {
        val previousTicketNumber = service.reopenAndGetPreviousTicket()
        logger.info("Ticket-Log - fetched previous ticket-number: $previousTicketNumber")

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = previousTicketNumber?.toString())
    }

    @PostMapping("/show-next")
    @TafelActiveDistributionRequired
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showNextTicket(@Valid @RequestBody request: TicketScreenShowNextTicketRequest) {
        val nextTicketNumber = service.closeCurrentTicketAndGetNext(request.costContributionPaid)
        logger.info("Ticket-Log - fetched next ticket-number: $nextTicketNumber")

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = nextTicketNumber?.toString())
    }

    private fun saveToOutbox(text: String, value: String?) {
        sseOutboxService.saveOutboxEntry(
            TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            TicketScreenShowText(
                text = text,
                value = value,
            ),
        )
    }
}

@ExcludeFromTestCoverage
data class TicketScreenShowText(
    @field:NotBlank
    val text: String,
    val value: String?,
)

@ExcludeFromTestCoverage
data class TicketScreenShowNextTicketRequest(
    val costContributionPaid: Boolean,
)
