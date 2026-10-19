package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.CarRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.CarResponse
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CarService(
    private val carRepository: CarRepository,
    private val foodCollectionRepository: FoodCollectionRepository,
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
        val licensePlate = normalizeLicensePlate(car.licensePlate)
        ensureLicensePlateIsFree(licensePlate, excludeCarId = null)

        val carEntity = CarEntity(
            licensePlate = licensePlate,
            sortOrder = nextSortOrder(),
            enabled = car.enabled,
        ).apply {
            name = car.name.trim()
        }

        val savedEntity = saveRefusingDuplicatePlate(carEntity)
        log.info("Created car {} ({})", savedEntity.id, sanitizeForLog(savedEntity.licensePlate))
        return mapCar(savedEntity)
    }

    fun updateCar(carId: Long, updatedCar: CarRequest): CarResponse {
        val carEntity = carRepository.findByIdOrNull(carId)
            ?: throw NotFoundException("Car with id $carId not found")

        val licensePlate = normalizeLicensePlate(updatedCar.licensePlate)
        ensureLicensePlateIsFree(licensePlate, excludeCarId = carId)

        carEntity.licensePlate = licensePlate
        carEntity.name = updatedCar.name.trim()
        carEntity.enabled = updatedCar.enabled
        carEntity.sortOrder = updatedCar.sortOrder

        val savedEntity = saveRefusingDuplicatePlate(carEntity)
        log.info("Updated car {} ({})", savedEntity.id, sanitizeForLog(savedEntity.licensePlate))
        return mapCar(savedEntity)
    }

    /**
     * A car is never snapshotted anywhere in reporting (unlike shelters), so the only thing that
     * blocks deletion is an actual food collection recorded against it - checked here rather than
     * left to the database's FK RESTRICT so the caller gets a clear 409 instead of a raw DB error.
     */
    @Transactional
    fun deleteCar(carId: Long) {
        val carEntity = carRepository.findByIdOrNull(carId)
            ?: throw NotFoundException("Fahrzeug (ID: $carId) nicht vorhanden!")

        if (foodCollectionRepository.existsByCarId(carId)) {
            throw ConflictException("Fahrzeug wird bereits in einer Routenerfassung verwendet und kann nicht gelöscht werden!")
        }

        carRepository.delete(carEntity)
        log.info("Deleted car {} ({})", carId, sanitizeForLog(carEntity.licensePlate))
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

    /**
     * A plate belongs to one car only, a deactivated one included - the create dialog offers to
     * re-activate that one instead. Checked here for a readable 409; the unique index behind it is
     * what decides between two requests that pass this check at the same time.
     */
    private fun ensureLicensePlateIsFree(licensePlate: String, excludeCarId: Long?) {
        if (carRepository.existsOtherWithLicensePlate(licensePlate, excludeCarId)) {
            throw ConflictException(duplicatePlateMessage(licensePlate))
        }
    }

    // Neither caller runs in a transaction of its own, so the repository's save commits - and the
    // index's violation surfaces - right here.
    private fun saveRefusingDuplicatePlate(carEntity: CarEntity): CarEntity = try {
        carRepository.save(carEntity)
    } catch (e: DataIntegrityViolationException) {
        throw ConflictException(duplicatePlateMessage(carEntity.licensePlate), e)
    }

    private fun duplicatePlateMessage(licensePlate: String) = "Ein Fahrzeug mit dem Kennzeichen $licensePlate ist bereits vorhanden!"

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
