package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions/tickets")
@PreAuthorize("hasAnyAuthority('CHECKIN', 'CUSTOMER')")
class DistributionTicketController(
    private val service: DistributionService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    @GetMapping("/households/{householdId}")
    @TafelActiveDistributionRequired
    fun getCurrentTicketForHouseholdId(
        @PathVariable householdId: Long,
    ): TicketNumberResponse {
        val distributionHouseholdEntity = service.getCurrentTicketNumber(householdId)
        logger.info("Ticket-Log - Fetched current ticket-number: $distributionHouseholdEntity")
        return TicketNumberResponse(
            ticketNumber = distributionHouseholdEntity?.ticketNumber,
        )
    }

    @DeleteMapping("/households/{householdId}")
    @TafelActiveDistributionRequired
    fun deleteCurrentTicketForHousehold(
        @PathVariable householdId: Long,
    ): ResponseEntity<Unit> {
        val deleted = service.deleteCurrentTicket(householdId)
        if (!deleted) {
            throw TafelValidationException("Löschen des Tickets von Kunde Nr. $householdId fehlgeschlagen!")
        }
        return ResponseEntity.ok().build()
    }
}
