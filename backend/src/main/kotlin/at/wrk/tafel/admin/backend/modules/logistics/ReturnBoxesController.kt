package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ReturnBoxesService
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesReturnedRequest
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/return-boxes")
class ReturnBoxesController(
    private val returnBoxesService: ReturnBoxesService,
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getReturnBoxes(): ReturnBoxesListResponse = returnBoxesService.getReturnBoxes()

    @PutMapping("/routes/{routeId}/shops/{shopId}")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun setReturned(
        @PathVariable routeId: Long,
        @PathVariable shopId: Long,
        @RequestBody request: ReturnBoxesReturnedRequest,
    ): ReturnBoxesListResponse = returnBoxesService.setReturned(routeId, shopId, request.returned)
}
