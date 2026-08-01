package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterReorderRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/shelters")
class SheltersController(
    private val shelterService: ShelterService,
) {

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    fun getActiveShelters(): ShelterListResponse = ShelterListResponse(
        shelters = shelterService.getActiveShelters(),
    )

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun getAllShelters(): ShelterListResponse = ShelterListResponse(
        shelters = shelterService.getAllShelters(),
    )

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createShelter(
        @Valid @RequestBody shelter: ShelterRequest,
    ): ResponseEntity<ShelterResponse> = ResponseEntity.status(HttpStatus.CREATED).body(shelterService.createShelter(shelter))

    @PutMapping("/{shelterId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateShelter(
        @PathVariable shelterId: Long,
        @Valid @RequestBody updatedShelter: ShelterRequest,
    ): ShelterResponse = shelterService.updateShelter(shelterId, updatedShelter)

    @PostMapping("/reorder")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun reorderShelters(
        @Valid @RequestBody request: ShelterReorderRequest,
    ): ShelterListResponse {
        shelterService.reorderShelters(request.shelterIds)
        return ShelterListResponse(shelters = shelterService.getAllShelters())
    }
}
