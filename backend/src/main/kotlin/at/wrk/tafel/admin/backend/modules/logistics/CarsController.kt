package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.CarService
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import at.wrk.tafel.admin.backend.modules.logistics.model.CarListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.CarReorderRequest
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/cars")
class CarsController(
    private val carService: CarService,
) {

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    fun getActiveCars(): CarListResponse = CarListResponse(
        cars = carService.getActiveCars(),
    )

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun getAllCars(): CarListResponse = CarListResponse(
        cars = carService.getAllCars(),
    )

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createCar(
        @RequestBody car: Car,
    ): Car = carService.createCar(car)

    @PostMapping("/{carId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateCar(
        @PathVariable carId: Long,
        @RequestBody updatedCar: Car,
    ): Car = carService.updateCar(carId, updatedCar)

    @PostMapping("/reorder")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun reorderCars(
        @RequestBody request: CarReorderRequest,
    ): CarListResponse {
        carService.reorderCars(request.carIds)
        return CarListResponse(cars = carService.getAllCars())
    }
}
