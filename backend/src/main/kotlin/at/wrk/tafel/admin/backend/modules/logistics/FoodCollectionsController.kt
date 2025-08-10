package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.common.api.ActiveDistributionRequired
import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.*
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/food-collections")
class FoodCollectionsController(
    private val foodCollectionService: FoodCollectionService
) {

    @GetMapping("/route/{routeId}")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun getFoodCollection(
        @PathVariable("routeId") routeId: Long
    ): ResponseEntity<FoodCollectionData> {
        val data = foodCollectionService.getFoodCollection(routeId)
            ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(data)
    }

    @PostMapping("/route/{routeId}")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun saveFoodCollectionRouteData(
        @PathVariable("routeId") routeId: Long,
        @RequestBody request: FoodCollectionSaveRouteData
    ): ResponseEntity<Unit> {
        foodCollectionService.saveRouteData(routeId, request)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/route/{routeId}/items")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun saveFoodCollectionItems(
        @PathVariable("routeId") routeId: Long,
        @RequestBody request: FoodCollectionItems
    ): ResponseEntity<Unit> {
        foodCollectionService.saveItems(routeId, request)
        return ResponseEntity.ok().build()
    }

    @GetMapping("/route/{routeId}/shop/{shopId}/items")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun getFoodCollectionItemsPerShop(
        @PathVariable("routeId") routeId: Long,
        @PathVariable("shopId") shopId: Long
    ): ResponseEntity<FoodCollectionItems> {
        val data = foodCollectionService.getItemsPerShop(routeId, shopId) ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(data)
    }

    @PostMapping("/route/{routeId}/shop/{shopId}/items")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun saveFoodCollectionItemsPerShop(
        @PathVariable("routeId") routeId: Long,
        @PathVariable("shopId") shopId: Long,
        @RequestBody request: FoodCollectionSaveItemsPerShopData
    ): ResponseEntity<Unit> {
        foodCollectionService.saveItemsPerShop(routeId, shopId, request)
        return ResponseEntity.ok().build()
    }

    @PatchMapping("/route/{routeId}/items")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @ActiveDistributionRequired
    fun patchFoodCollectionItem(
        @PathVariable("routeId") routeId: Long,
        @RequestBody request: FoodCollectionItem
    ): ResponseEntity<Unit> {
        foodCollectionService.patchItem(routeId, request)
        return ResponseEntity.ok().build()
    }

}
