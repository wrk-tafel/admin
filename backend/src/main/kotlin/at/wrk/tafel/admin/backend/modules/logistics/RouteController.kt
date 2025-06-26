package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/routes")
class RouteController(
    private val routeService: RouteService
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getRoutes(): RouteListResponse {
        val routes = routeService.getRoutes()
        return RouteListResponse(routes = routes)
    }

    // TODO seperate shops from routes?
    // especially cause the sorting is done in the service and is needed for the frontend

}
