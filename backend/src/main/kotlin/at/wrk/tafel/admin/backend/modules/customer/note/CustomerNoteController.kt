package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import org.springframework.http.ResponseEntity
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

    @PostMapping
    fun createNewNote(
        @PathVariable("customerId") customerId: Long,
        @RequestBody request: CreateCustomerNoteRequest
    ): ResponseEntity<CustomerNoteItem> {
        val note = request.note.ifBlank { throw TafelValidationFailedException("Notiz darf nicht leer sein!") }
        val persistedNote = service.createNewNote(customerId, note)
        return ResponseEntity.ok(persistedNote)
    }

}
