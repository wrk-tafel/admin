package at.wrk.tafel.admin.backend.modules.distribution.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.model.*
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions/tickets")
class DistributionTicketController(
    private val service: DistributionService
) {

    @GetMapping("/current")
    fun getCurrentTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val currentTicket = service.getCurrentTicket(distribution)
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @GetMapping("/next")
    fun getNextTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val nextTicket = service.closeCurrentTicketAndGetNext(distribution)
        return TicketNumberResponse(ticketNumber = nextTicket)
    }

}
