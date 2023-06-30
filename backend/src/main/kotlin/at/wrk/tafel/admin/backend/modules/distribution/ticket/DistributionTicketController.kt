package at.wrk.tafel.admin.backend.modules.distribution.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.model.*
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
    ) {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        service.deleteCurrentTicket(distribution, customerId)
    }

    @GetMapping("/next")
    fun getNextTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val nextTicket = service.closeCurrentTicketAndGetNext(distribution)
        return TicketNumberResponse(ticketNumber = nextTicket)
    }

}
