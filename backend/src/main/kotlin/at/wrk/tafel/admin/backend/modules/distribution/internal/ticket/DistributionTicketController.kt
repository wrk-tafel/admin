package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/distributions/tickets")
class DistributionTicketController(
    private val service: DistributionService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    @GetMapping("/customers/{customerId}")
    fun getCurrentTicketForCustomerId(
        @PathVariable("customerId") customerId: Long,
    ): TicketNumberResponse {
        val currentTicket = service.getCurrentTicketNumber(customerId)
        logger.info("Ticket-Log - Fetched current ticket-number: $currentTicket")
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @DeleteMapping("/customers/{customerId}")
    fun deleteCurrentTicketForCustomer(
        @PathVariable("customerId") customerId: Long,
    ): ResponseEntity<Unit> {
        val deleted = service.deleteCurrentTicket(customerId)
        if (!deleted) {
            throw TafelValidationException("Löschen des Tickets von Kunde Nr. $customerId fehlgeschlagen!")
        }
        return ResponseEntity.ok().build()
    }

}
