package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.modules.notification.internal.AnnouncementService
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementListResponse
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementRequest
import at.wrk.tafel.admin.backend.modules.notification.model.AnnouncementResponse
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
import org.springframework.web.bind.annotation.RestController

/** Messages administrators publish for every user; they reach users through their bell. */
@RestController
@RequestMapping("/api/announcements")
@PreAuthorize("hasAuthority('ADMINISTRATOR')")
class AnnouncementController(
    private val announcementService: AnnouncementService,
) {

    @GetMapping
    fun getAnnouncements(): AnnouncementListResponse = announcementService.getAnnouncements()

    @PostMapping
    fun createAnnouncement(@Valid @RequestBody request: AnnouncementRequest): ResponseEntity<AnnouncementResponse> = ResponseEntity.status(HttpStatus.CREATED).body(announcementService.create(request))

    @PutMapping("/{id}")
    fun updateAnnouncement(@PathVariable id: Long, @Valid @RequestBody request: AnnouncementRequest): AnnouncementResponse = announcementService.update(id, request)

    @DeleteMapping("/{id}")
    fun deleteAnnouncement(@PathVariable id: Long): ResponseEntity<Void> {
        announcementService.delete(id)
        return ResponseEntity.noContent().build()
    }
}
