package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteService
import at.wrk.tafel.admin.backend.modules.logistics.internal.ShopService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopsResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/routes")
class RouteController(
    private val routeService: RouteService,
    private val shopService: ShopService,
) {

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getActiveRoutes(): RouteListResponse = RouteListResponse(
        routes = routeService.getActiveRoutes(),
    )

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun getAllRoutes(): RouteListResponse = RouteListResponse(
        routes = routeService.getAllRoutes(),
    )

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createRoute(
        @Valid @RequestBody route: RouteRequest,
    ): ResponseEntity<RouteResponse> = ResponseEntity.status(HttpStatus.CREATED).body(routeService.createRoute(route))

    @PutMapping("/{routeId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateRoute(
        @PathVariable routeId: Long,
        @Valid @RequestBody updatedRoute: RouteRequest,
    ): RouteResponse = routeService.updateRoute(routeId, updatedRoute)

    @GetMapping("/{routeId}/shops")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getShopsOfRoute(
        @PathVariable routeId: Long,
    ): RouteShopsResponse = RouteShopsResponse(
        shops = shopService.getShopsForRouteId(routeId),
    )
}
