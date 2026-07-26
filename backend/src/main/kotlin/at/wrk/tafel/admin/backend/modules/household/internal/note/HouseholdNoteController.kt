package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
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
@RequestMapping("/api/households/{householdId}/notes")
@PreAuthorize("hasAuthority('CUSTOMER')")
class HouseholdNoteController(
    private val service: HouseholdNoteService
) {

    @GetMapping
    fun getNotes(
        @PathVariable householdId: Long,
        @RequestParam("page") page: Int?
    ): HouseholdNotesResponse {
        val searchResult = service.getNotes(householdId = householdId, page = page)
        return HouseholdNotesResponse(
            items = searchResult.items,
            totalCount = searchResult.totalCount,
            currentPage = searchResult.currentPage,
            totalPages = searchResult.totalPages,
            pageSize = searchResult.pageSize
        )
    }

    @PostMapping
    fun createNewNote(
        @PathVariable householdId: Long,
        @RequestBody request: CreateHouseholdNoteRequest
    ): ResponseEntity<HouseholdNoteItem> {
        val note = request.note.ifBlank { throw TafelValidationException("Notiz darf nicht leer sein!") }
        val persistedNote = service.createNewNote(householdId, note)
        return ResponseEntity.ok(persistedNote)
    }

}
