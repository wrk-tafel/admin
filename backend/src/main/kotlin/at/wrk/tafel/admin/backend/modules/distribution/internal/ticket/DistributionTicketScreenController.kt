package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal

@RestController
@RequestMapping("/api/distributions/ticket-screen")
class DistributionTicketScreenController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        const val TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME = "ticket_screen_show_value"
        const val TICKET_SCREEN_TITLE = "Ticket"
    }

    @PostMapping("/show-text")
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showText(@Valid @RequestBody request: TicketScreenShowTextRequest) {
        saveToOutbox(text = request.text, value = request.value)
    }

    @PostMapping("/show-current")
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showCurrentTicket(): TicketScreenTicketResponse {
        val response = service.getCurrentTicketScreenTicket()

        saveToOutbox(text = TICKET_SCREEN_TITLE, response.ticketNumber?.toString())
        return response
    }

    @PostMapping("/show-previous")
    @TafelActiveDistributionRequired
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showPreviousTicket(): TicketScreenTicketResponse {
        val response = service.reopenAndGetPreviousTicket()

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = response.ticketNumber?.toString())
        return response
    }

    @PostMapping("/show-next")
    @TafelActiveDistributionRequired
    @PreAuthorize("hasAnyAuthority('CHECKIN', 'SCANNER')")
    fun showNextTicket(@Valid @RequestBody request: TicketScreenShowNextTicketRequest): TicketScreenTicketResponse {
        val response = service.closeCurrentTicketAndGetNext(request.costContributionPaid)

        saveToOutbox(text = TICKET_SCREEN_TITLE, value = response.ticketNumber?.toString())
        return response
    }

    private fun saveToOutbox(text: String, value: String?) {
        sseOutboxService.saveOutboxEntry(
            TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
            TicketScreenShowTextRequest(
                text = text,
                value = value,
            ),
        )
    }
}

@ExcludeFromTestCoverage
data class TicketScreenShowTextRequest(
    @field:NotBlank
    val text: String,
    val value: String?,
)

@ExcludeFromTestCoverage
data class TicketScreenShowNextTicketRequest(
    val costContributionPaid: Boolean,
)

@ExcludeFromTestCoverage
data class TicketScreenTicketResponse(
    val ticketNumber: Int?,
    val householdId: Long?,
    val pendingCostContribution: BigDecimal?,
)
