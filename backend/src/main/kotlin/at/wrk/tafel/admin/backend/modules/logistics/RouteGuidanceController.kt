package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteGuidanceService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceStopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopCompletionRequest
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/routes/{routeId}/guidance")
class RouteGuidanceController(
    private val routeGuidanceService: RouteGuidanceService,
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getGuidance(
        @PathVariable routeId: Long,
    ): RouteGuidanceResponse = routeGuidanceService.getGuidance(routeId)

    @PutMapping("/stops/{stopId}")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun setStopCompletion(
        @PathVariable routeId: Long,
        @PathVariable stopId: Long,
        @Valid @RequestBody completion: RouteStopCompletionRequest,
    ): RouteGuidanceStopItem = routeGuidanceService.setCompletion(routeId, stopId, completion.completed)
}
