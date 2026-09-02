package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/households/{householdId}/notes")
@PreAuthorize("hasAuthority('CUSTOMER')")
class HouseholdNoteController(
    private val service: HouseholdNoteService,
) {

    // Also reachable with CHECKIN alone: the check-in screen loads a household's notes as part of
    // its normal customer lookup (its "Aktuellste Notiz" preview) - writes stay CUSTOMER-only (#3623).
    @GetMapping
    @PreAuthorize("hasAnyAuthority('CUSTOMER', 'CHECKIN')")
    fun getNotes(
        @PathVariable householdId: Long,
        @RequestParam("page") page: Int?,
        @RequestParam("pageSize") pageSize: Int? = null,
    ): PagedResponse<HouseholdNoteItem> {
        val searchResult = service.getNotes(householdId = householdId, page = page, pageSize = pageSize)
        return PagedResponse(
            items = searchResult.items,
            totalCount = searchResult.totalCount,
            currentPage = searchResult.currentPage,
            totalPages = searchResult.totalPages,
            pageSize = searchResult.pageSize,
        )
    }

    @PostMapping
    fun createNewNote(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: CreateHouseholdNoteRequest,
    ): ResponseEntity<HouseholdNoteItem> {
        val persistedNote = service.createNewNote(householdId, request.note)
        return ResponseEntity.status(HttpStatus.CREATED).body(persistedNote)
    }

    @PutMapping("/{noteId}")
    fun updateNote(
        @PathVariable householdId: Long,
        @PathVariable noteId: Long,
        @Valid @RequestBody request: UpdateHouseholdNoteRequest,
    ): HouseholdNoteItem = service.updateNote(householdId, noteId, request.note)

    @DeleteMapping("/{noteId}")
    fun deleteNote(
        @PathVariable householdId: Long,
        @PathVariable noteId: Long,
    ): ResponseEntity<Unit> {
        service.deleteNote(householdId, noteId)
        return ResponseEntity.noContent().build()
    }
}
