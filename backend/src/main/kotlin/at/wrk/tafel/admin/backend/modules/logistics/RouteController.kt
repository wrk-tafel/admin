package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteService
import at.wrk.tafel.admin.backend.modules.logistics.internal.ShopService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopsResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/routes")
class RouteController(
    private val routeService: RouteService,
    private val shopService: ShopService,
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getRoutes(): RouteListResponse {
        val routes = routeService.getRoutes()
        return RouteListResponse(routes = routes)
    }

    @GetMapping("/{routeId}/shops")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getShopsOfRoute(
        @PathVariable("routeId") routeId: Long,
    ): RouteShopsResponse {
        val shops = shopService.getShopsForRouteId(routeId)
        return RouteShopsResponse(shops = shops)
    }

}
