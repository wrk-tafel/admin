package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.api.ActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions/tickets")
class DistributionTicketController(
    private val service: DistributionService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    @GetMapping("/customers/{customerId}")
    @ActiveDistributionRequired
    fun getCurrentTicketForCustomerId(
        @PathVariable("customerId") customerId: Long,
    ): TicketNumberResponse {
        val distributionCustomerEntity = service.getCurrentTicketNumber(customerId)
        logger.info("Ticket-Log - Fetched current ticket-number: $distributionCustomerEntity")
        return TicketNumberResponse(
            ticketNumber = distributionCustomerEntity?.ticketNumber,
            costContributionPaid = distributionCustomerEntity?.costContributionPaid ?: true,
        )
    }

    @DeleteMapping("/customers/{customerId}")
    @ActiveDistributionRequired
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
