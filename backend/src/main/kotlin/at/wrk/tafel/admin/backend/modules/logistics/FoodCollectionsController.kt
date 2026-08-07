package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.*
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/food-collections")
@PreAuthorize("hasAuthority('LOGISTICS')")
class FoodCollectionsController(
    private val foodCollectionService: FoodCollectionService,
) {

    @GetMapping("/routes/{routeId}")
    @TafelActiveDistributionRequired
    fun getFoodCollection(
        @PathVariable routeId: Long,
    ): ResponseEntity<FoodCollectionResponse> {
        val data = foodCollectionService.getFoodCollection(routeId)
            ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(data)
    }

    @PostMapping("/routes/{routeId}")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionRouteData(
        @PathVariable routeId: Long,
        @Valid @RequestBody request: FoodCollectionSaveRouteRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveRouteData(routeId, request)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/routes/{routeId}/km")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionKm(
        @PathVariable routeId: Long,
        @Valid @RequestBody request: FoodCollectionSaveKmRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveKm(routeId, request)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/routes/{routeId}/items")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionItems(
        @PathVariable routeId: Long,
        @Valid @RequestBody request: FoodCollectionItemsRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveItems(routeId, request)
        return ResponseEntity.ok().build()
    }

    @GetMapping("/routes/{routeId}/shops/{shopId}/items")
    @TafelActiveDistributionRequired
    fun getFoodCollectionItemsPerShop(
        @PathVariable routeId: Long,
        @PathVariable shopId: Long,
    ): ResponseEntity<FoodCollectionItemsResponse> {
        val data = foodCollectionService.getItemsPerShop(routeId, shopId) ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(data)
    }

    @PostMapping("/routes/{routeId}/shops/{shopId}/items")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionItemsPerShop(
        @PathVariable routeId: Long,
        @PathVariable shopId: Long,
        @Valid @RequestBody request: FoodCollectionSaveItemsPerShopRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveItemsPerShop(routeId, shopId, request)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/routes/{routeId}/return-items")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionReturnItems(
        @PathVariable routeId: Long,
        @Valid @RequestBody request: FoodCollectionSaveReturnItemsRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveReturnItems(routeId, request)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/routes/{routeId}/shops/{shopId}/return-items")
    @TafelActiveDistributionRequired
    fun saveFoodCollectionReturnItemsPerShop(
        @PathVariable routeId: Long,
        @PathVariable shopId: Long,
        @Valid @RequestBody request: FoodCollectionSaveReturnItemsPerShopRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.saveReturnItemsPerShop(routeId, shopId, request)
        return ResponseEntity.ok().build()
    }

    @PatchMapping("/routes/{routeId}/items")
    @TafelActiveDistributionRequired
    fun patchFoodCollectionItem(
        @PathVariable routeId: Long,
        @Valid @RequestBody request: FoodCollectionItemRequest,
    ): ResponseEntity<Unit> {
        foodCollectionService.patchItem(routeId, request)
        return ResponseEntity.ok().build()
    }
}
