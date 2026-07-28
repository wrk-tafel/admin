package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterReorderRequest
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/shelters")
@PreAuthorize("isAuthenticated()")
class SheltersController(
    private val shelterService: ShelterService,
) {

    @GetMapping("/active")
    fun getActiveShelters(): ShelterListResponse = ShelterListResponse(
        shelters = shelterService.getActiveShelters(),
    )

    @GetMapping
    fun getAllShelters(): ShelterListResponse = ShelterListResponse(
        shelters = shelterService.getAllShelters(),
    )

    @PostMapping
    fun createShelter(
        @RequestBody shelter: Shelter,
    ): Shelter = shelterService.createShelter(shelter)

    @PostMapping("/{shelterId}")
    fun updateShelter(
        @PathVariable shelterId: Long,
        @RequestBody updatedShelter: Shelter,
    ): Shelter = shelterService.updateShelter(shelterId, updatedShelter)

    @PostMapping("/reorder")
    fun reorderShelters(
        @RequestBody request: ShelterReorderRequest,
    ): ShelterListResponse {
        shelterService.reorderShelters(request.shelterIds)
        return ShelterListResponse(shelters = shelterService.getAllShelters())
    }
}
