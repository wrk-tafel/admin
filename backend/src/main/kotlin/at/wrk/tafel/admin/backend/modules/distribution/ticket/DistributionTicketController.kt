package at.wrk.tafel.admin.backend.modules.distribution.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.model.TicketNumberResponse
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/distributions/tickets")
class DistributionTicketController(
    private val service: DistributionService
) {

    @GetMapping("/current")
    fun getCurrentTicket(
        @RequestParam("customerId", required = false) customerId: Long? = null
    ): TicketNumberResponse {
        val currentTicket = service.getCurrentTicketNumber(customerId)
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @DeleteMapping("/current")
    fun deleteCurrentTicketForCustomer(
        @RequestParam("customerId") customerId: Long
    ): ResponseEntity<Void> {
        val deleted = service.deleteCurrentTicket(customerId)
        if (!deleted) {
            throw TafelValidationException("Löschen des Tickets von Kunde Nr. $customerId fehlgeschlagen!")
        }
        return ResponseEntity.ok().build()
    }

    @GetMapping("/next")
    fun getNextTicket(): TicketNumberResponse {
        val nextTicket = service.closeCurrentTicketAndGetNext()
        return TicketNumberResponse(ticketNumber = nextTicket)
    }

}
