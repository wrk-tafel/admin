package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.EntityNotFoundException
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/tickets")
@PreAuthorize("hasAuthority('CHECKIN')")
class TicketController(
    private val service: TicketService
) {

    @GetMapping("/next")
    fun getNextTicket(): NextTicketResponse {
        val nextTicket = service.getNextTicket() ?: throw EntityNotFoundException("Next ticket number not available")
        return NextTicketResponse(ticketNumber = nextTicket)
    }

}

@ExcludeFromTestCoverage
data class NextTicketResponse(
    val ticketNumber: Int
)
