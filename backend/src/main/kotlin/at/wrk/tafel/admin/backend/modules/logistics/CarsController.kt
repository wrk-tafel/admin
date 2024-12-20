package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.CarService
import at.wrk.tafel.admin.backend.modules.logistics.model.CarListResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/cars")
class CarsController(
    private val carService: CarService
) {

    @GetMapping
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun getCars(): CarListResponse {
        return CarListResponse(
            cars = carService.getCars()
        )
    }

}
