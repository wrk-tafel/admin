package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketHouseholdResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/distributions/tickets")
@PreAuthorize("hasAnyAuthority('CHECKIN', 'CUSTOMER')")
class DistributionTicketLookupController(
    private val service: DistributionService,
) {

    @GetMapping("/{ticketNumber}")
    @TafelActiveDistributionRequired
    fun getHouseholdForTicketNumber(
        @PathVariable ticketNumber: Int,
    ): TicketHouseholdResponse = TicketHouseholdResponse(
        ticketNumber = ticketNumber,
        householdId = service.getHouseholdIdForTicketNumber(ticketNumber),
    )
}
