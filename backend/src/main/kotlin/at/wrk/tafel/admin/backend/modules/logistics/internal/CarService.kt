package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.CarRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.CarResponse
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CarService(
    private val carRepository: CarRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(CarService::class.java)
    }

    @Transactional(readOnly = true)
    fun getActiveCars(): List<CarResponse> = carRepository.findByEnabledIsTrue()
        .map { mapCar(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    @Transactional(readOnly = true)
    fun getAllCars(): List<CarResponse> = carRepository.findAll()
        .map { mapCar(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    fun createCar(car: CarRequest): CarResponse {
        val carEntity = CarEntity(
            licensePlate = normalizeLicensePlate(car.licensePlate),
            sortOrder = nextSortOrder(),
            enabled = car.enabled,
        ).apply {
            name = car.name.trim()
        }

        val savedEntity = carRepository.save(carEntity)
        log.info("Created car {} ({})", savedEntity.id, sanitizeForLog(savedEntity.licensePlate))
        return mapCar(savedEntity)
    }

    fun updateCar(carId: Long, updatedCar: CarRequest): CarResponse {
        val carEntity = carRepository.findByIdOrNull(carId)
            ?: throw NotFoundException("Car with id $carId not found")

        carEntity.licensePlate = normalizeLicensePlate(updatedCar.licensePlate)
        carEntity.name = updatedCar.name.trim()
        carEntity.enabled = updatedCar.enabled
        carEntity.sortOrder = updatedCar.sortOrder

        val savedEntity = carRepository.save(carEntity)
        log.info("Updated car {} ({})", savedEntity.id, sanitizeForLog(savedEntity.licensePlate))
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
        log.info("Reordered cars: {}", carIds)
    }

    private fun nextSortOrder(): Int = (carRepository.findAll().maxOfOrNull { it.sortOrder } ?: 0) + 1

    /**
     * A license plate is stored in exactly one shape, whoever writes it: the food-collection car
     * dropdown lists the plates verbatim, so `w-12345x` next to `W-12345X` reads as two vehicles.
     * The screen normalizes as the admin types - this is what makes that hold for every caller.
     */
    private fun normalizeLicensePlate(licensePlate: String): String = licensePlate.trim().uppercase()

    private fun mapCar(carEntity: CarEntity): CarResponse = CarResponse(
        id = carEntity.id!!,
        licensePlate = carEntity.licensePlate,
        name = carEntity.name!!,
        enabled = carEntity.enabled,
        sortOrder = carEntity.sortOrder,
    )
}
