package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/distributions")
@PreAuthorize("hasAuthority('DISTRIBUTIONS')")
class DistributionController(
    private val service: DistributionService
) {

    @PostMapping("/start")
    fun startDistribution(): DistributionItem {
        val distribution = service.startDistribution()
        return mapDistribution(distribution)
    }

    @PostMapping("/{distributionId}/end")
    fun endDistribution(
        @PathVariable("distributionId") distributionId: Long? = null,
    ) {
        distributionId?.let { service.endDistribution(distributionId) }
    }

    @GetMapping("/current")
    fun getCurrentDistribution(): ResponseEntity<DistributionItem> {
        val distribution = service.getCurrentDistribution()
        if (distribution != null) {
            return ResponseEntity.ok(mapDistribution(distribution))
        }

        return ResponseEntity.noContent().build()
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem {
        return DistributionItem(id = distribution.id!!)
    }

}

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long
)
