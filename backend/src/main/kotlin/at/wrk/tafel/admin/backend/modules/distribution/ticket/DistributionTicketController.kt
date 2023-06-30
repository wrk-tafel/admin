package at.wrk.tafel.admin.backend.modules.distribution.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.model.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions/tickets")
class DistributionTicketController(
    private val service: DistributionService
) {

    @GetMapping("/current")
    fun getCurrentTicket(
        @RequestParam("customerId", required = false) customerId: Long? = null
    ): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val currentTicket = service.getCurrentTicketNumber(distribution, customerId)
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @DeleteMapping("/current")
    fun deleteCurrentTicketForCustomer(
        @RequestParam("customerId") customerId: Long
    ): ResponseEntity<Void> {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val deleted = service.deleteCurrentTicket(distribution, customerId)
        val status = if (deleted) HttpStatus.OK else HttpStatus.BAD_REQUEST
        return ResponseEntity.status(status).build()
    }

    @GetMapping("/next")
    fun getNextTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val nextTicket = service.closeCurrentTicketAndGetNext(distribution)
        return TicketNumberResponse(ticketNumber = nextTicket)
    }

}
