package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.CarRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.CarResponse
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CarService(
    private val carRepository: CarRepository,
) {

    @Transactional(readOnly = true)
    fun getActiveCars(): List<CarResponse> = carRepository.findByEnabledIsTrue()
        .map { mapCar(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    @Transactional(readOnly = true)
    fun getAllCars(): List<CarResponse> = carRepository.findAll()
        .map { mapCar(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    fun createCar(car: CarRequest): CarResponse {
        val carEntity = CarEntity().apply {
            licensePlate = car.licensePlate
            name = car.name
            enabled = car.enabled
            sortOrder = nextSortOrder()
        }

        val savedEntity = carRepository.save(carEntity)
        return mapCar(savedEntity)
    }

    fun updateCar(carId: Long, updatedCar: CarRequest): CarResponse {
        val carEntity = carRepository.findByIdOrNull(carId)
            ?: throw NotFoundException("Car with id $carId not found")

        carEntity.licensePlate = updatedCar.licensePlate
        carEntity.name = updatedCar.name
        carEntity.enabled = updatedCar.enabled
        carEntity.sortOrder = updatedCar.sortOrder

        val savedEntity = carRepository.save(carEntity)
        return mapCar(savedEntity)
    }

    @Transactional
    fun reorderCars(carIds: List<Long>) {
        carIds.forEachIndexed { index, carId ->
            val entity = carRepository.findByIdOrNull(carId)
                ?: throw NotFoundException("Car with id $carId not found")

            entity.sortOrder = index + 1
            carRepository.save(entity)
        }
    }

    private fun nextSortOrder(): Int = (carRepository.findAll().maxOfOrNull { it.sortOrder ?: 0 } ?: 0) + 1

    private fun mapCar(carEntity: CarEntity): CarResponse = CarResponse(
        id = carEntity.id!!,
        licensePlate = carEntity.licensePlate!!,
        name = carEntity.name!!,
        enabled = carEntity.enabled!!,
        sortOrder = carEntity.sortOrder ?: 0,
    )
}
