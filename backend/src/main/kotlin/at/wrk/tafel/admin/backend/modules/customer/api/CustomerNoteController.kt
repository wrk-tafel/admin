package at.wrk.tafel.admin.backend.modules.customer.api

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.customer.api.model.CreateCustomerNoteRequest
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerNoteItem
import at.wrk.tafel.admin.backend.modules.customer.service.internal.note.CustomerNoteInternalService
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerNotesResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/customers/{customerId}/notes")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerNoteController(
    private val service: CustomerNoteInternalService
) {

    @GetMapping
    fun getNotes(
        @PathVariable("customerId") customerId: Long,
        @RequestParam("page") page: Int?
    ): CustomerNotesResponse {
        val searchResult = service.getNotes(customerId = customerId, page = page)
        return CustomerNotesResponse(
            items = searchResult.items,
            totalCount = searchResult.totalCount,
            currentPage = searchResult.currentPage,
            totalPages = searchResult.totalPages,
            pageSize = searchResult.pageSize
        )
    }

    @PostMapping
    fun createNewNote(
        @PathVariable("customerId") customerId: Long,
        @RequestBody request: CreateCustomerNoteRequest
    ): ResponseEntity<CustomerNoteItem> {
        val note = request.note.ifBlank { throw TafelValidationException("Notiz darf nicht leer sein!") }
        val persistedNote = service.createNewNote(customerId, note)
        return ResponseEntity.ok(persistedNote)
    }

}
