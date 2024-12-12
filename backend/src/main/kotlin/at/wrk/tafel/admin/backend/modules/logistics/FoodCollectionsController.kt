package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionData
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionsRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/food-collections")
class FoodCollectionsController(
    private val foodCollectionService: FoodCollectionService
) {

    @GetMapping("/route/{routeId}")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getFoodCollection(
        @PathVariable("routeId") routeId: Long
    ): FoodCollectionData {
        return FoodCollectionData(
            items = foodCollectionService.getFoodCollectionItems(routeId)
        )
    }

    @PostMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun saveFoodCollection(@RequestBody request: FoodCollectionsRequest): ResponseEntity<Unit> {
        foodCollectionService.save(request)
        return ResponseEntity.ok().build()
    }

}
