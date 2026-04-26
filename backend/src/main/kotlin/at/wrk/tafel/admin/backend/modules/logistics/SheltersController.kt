package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/shelters")
@PreAuthorize("isAuthenticated()")
class SheltersController(
    private val shelterService: ShelterService,
) {

    @GetMapping("/active")
    fun getActiveShelters(): ShelterListResponse {
        return ShelterListResponse(
            shelters = shelterService.getActiveShelters()
        )
    }

    @GetMapping
    fun getAllShelters(): ShelterListResponse {
        return ShelterListResponse(
            shelters = shelterService.getAllShelters()
        )
    }

    @PostMapping
    fun createShelter(
        @RequestBody shelter: Shelter
    ): Shelter {
        return shelterService.createShelter(shelter)
    }

    @PostMapping("/{shelterId}")
    fun updateShelter(
        @PathVariable shelterId: Long,
        @RequestBody updatedShelter: Shelter
    ): Shelter {
        return shelterService.updateShelter(shelterId, updatedShelter)
    }

}
