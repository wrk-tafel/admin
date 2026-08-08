package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/households/{householdId}/ticket")
@PreAuthorize("hasAnyAuthority('CHECKIN', 'CUSTOMER')")
class DistributionTicketController(
    private val service: DistributionService,
) {

    @GetMapping
    @TafelActiveDistributionRequired
    fun getCurrentTicketForHouseholdId(
        @PathVariable householdId: Long,
    ): TicketNumberResponse = TicketNumberResponse(
        ticketNumber = service.getCurrentTicketNumberValue(householdId),
    )

    @DeleteMapping
    @TafelActiveDistributionRequired
    fun deleteCurrentTicketForHousehold(
        @PathVariable householdId: Long,
    ): ResponseEntity<Unit> {
        val deleted = service.deleteCurrentTicket(householdId)
        if (!deleted) {
            throw BusinessRuleException("Löschen des Tickets von Kunde Nr. $householdId fehlgeschlagen!")
        }
        return ResponseEntity.noContent().build()
    }
}
