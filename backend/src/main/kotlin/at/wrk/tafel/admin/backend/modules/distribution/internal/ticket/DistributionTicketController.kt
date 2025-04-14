package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/distributions/tickets")
@MessageMapping("/ticket-screen")
class DistributionTicketController(
    private val service: DistributionService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    @SubscribeMapping
    fun getCurrentTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()

        val response = distribution?.let {
            val response = getCurrentTicketForCustomerId(customerId = null)
            logger.info("Ticket-Log - Fetched current ticket-number: ${response.ticketNumber}")
            response
        }
        return response ?: TicketNumberResponse(ticketNumber = null)
    }

    @GetMapping("/current")
    fun getCurrentTicketForCustomerId(
        @RequestParam("customerId", required = false) customerId: Long? = null
    ): TicketNumberResponse {
        val currentTicket = service.getCurrentTicketNumber(customerId)
        logger.info("Ticket-Log - Fetched current ticket-number: $currentTicket")
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @DeleteMapping("/current")
    fun deleteCurrentTicketForCustomer(
        @RequestParam("customerId") customerId: Long
    ): ResponseEntity<Unit> {
        val deleted = service.deleteCurrentTicket(customerId)
        if (!deleted) {
            throw TafelValidationException("Löschen des Tickets von Kunde Nr. $customerId fehlgeschlagen!")
        }
        return ResponseEntity.ok().build()
    }

    @GetMapping("/next")
    fun getNextTicket(): TicketNumberResponse {
        val nextTicketNumber = service.closeCurrentTicketAndGetNext()
        logger.info("Ticket-Log - fetched next ticket-number: $nextTicketNumber")

        return TicketNumberResponse(ticketNumber = nextTicketNumber)
    }

}
