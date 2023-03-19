package at.wrk.tafel.admin.backend.modules.customer.note

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/customers/{customerId}/notes")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerNoteController(
    private val service: CustomerNoteService
) {

    @GetMapping
    fun getNotes(@PathVariable("customerId") customerId: Long): CustomerNotesResponse {
        val notes = service.getNotes(customerId)
        return CustomerNotesResponse(notes = notes)
    }

}
