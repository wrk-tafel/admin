package at.wrk.tafel.admin.backend.modules.distribution

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions")
@PreAuthorize("hasAuthority('DISTRIBUTIONS')")
class DistributionController(
    private val service: DistributionService
) {

    @PostMapping("/start")
    fun startDistribution() {
        service.startDistribution()
    }

    @PostMapping("/end")
    fun endDistribution() {
        service.endDistribution()
    }

}
