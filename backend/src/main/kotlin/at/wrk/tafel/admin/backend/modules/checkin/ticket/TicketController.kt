package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/tickets")
@PreAuthorize("hasAuthority('CHECKIN')")
class TicketController(
    private val service: TicketService
) {

    @GetMapping("/next")
    fun getNextTicket(): ResponseEntity<NextTicketResponse> {
        val nextTicket = service.getNextTicket() ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(NextTicketResponse(ticketNumber = nextTicket))
    }

}

@ExcludeFromTestCoverage
data class NextTicketResponse(
    val ticketNumber: Int
)
