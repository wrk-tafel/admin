package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/shelters")
@PreAuthorize("isAuthenticated()")
class SheltersController(
    private val shelterService: ShelterService,
) {

    @GetMapping
    fun getShelters(): ShelterListResponse {
        return ShelterListResponse(
            shelters = shelterService.getShelters()
        )
    }

}
