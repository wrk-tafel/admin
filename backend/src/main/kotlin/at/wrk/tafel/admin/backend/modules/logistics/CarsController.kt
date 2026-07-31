package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.CarService
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import at.wrk.tafel.admin.backend.modules.logistics.model.CarListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.CarReorderRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
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
        @Valid @RequestBody car: Car,
    ): ResponseEntity<Car> = ResponseEntity.status(HttpStatus.CREATED).body(carService.createCar(car))

    @PutMapping("/{carId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateCar(
        @PathVariable carId: Long,
        @Valid @RequestBody updatedCar: Car,
    ): Car = carService.updateCar(carId, updatedCar)

    @PostMapping("/reorder")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun reorderCars(
        @Valid @RequestBody request: CarReorderRequest,
    ): CarListResponse {
        carService.reorderCars(request.carIds)
        return CarListResponse(cars = carService.getAllCars())
    }
}
