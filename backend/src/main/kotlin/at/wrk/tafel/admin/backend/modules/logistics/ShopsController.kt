package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShopService
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopResponse
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
@RequestMapping("/api/shops")
@PreAuthorize("hasAuthority('SETTINGS')")
class ShopsController(
    private val shopService: ShopService,
) {

    @GetMapping
    fun getAllShops(): ShopListResponse = ShopListResponse(
        shops = shopService.getAllShops(),
    )

    @PostMapping
    fun createShop(
        @Valid @RequestBody shop: ShopRequest,
    ): ResponseEntity<ShopResponse> = ResponseEntity.status(HttpStatus.CREATED).body(shopService.createShop(shop))

    @PutMapping("/{shopId}")
    fun updateShop(
        @PathVariable shopId: Long,
        @Valid @RequestBody updatedShop: ShopRequest,
    ): ShopResponse = shopService.updateShop(shopId, updatedShop)
}
