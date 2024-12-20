package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import org.springframework.stereotype.Service

@Service
class CarService(
    private val carRepository: CarRepository
) {

    fun getCars(): List<Car> {
        val routes = carRepository.findAll().toList()
        return routes.map { mapCar(it) }
    }

    private fun mapCar(carEntity: CarEntity): Car {
        return Car(
            id = carEntity.id!!,
            licensePlate = carEntity.licensePlate!!,
            name = carEntity.name!!,
        )
    }

}
