package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

/**
 * `cars_license_plate_unique_idx` (R__00132) is what keeps two cars from sharing a plate when two
 * creates pass `CarService`'s own check at the same time - only a real Postgres shows the index
 * exists and compares the way that check does.
 */
@Transactional
class CarLicensePlateUniqueIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var carRepository: CarRepository

    private fun plate() = "W-IT-${generateRandomLong() % 1_000_000_000}"

    private fun persist(licensePlate: String, enabled: Boolean = true): CarEntity {
        val car = CarEntity(licensePlate = licensePlate, sortOrder = 1, enabled = enabled).apply { name = "car" }
        testEntityManager.persist(car)
        testEntityManager.flush()
        return car
    }

    @Test
    fun `a second car with the same plate is refused by the database, whatever its case or blanks`() {
        val plate = plate()
        persist(plate)

        assertThatThrownBy { persist("  ${plate.lowercase()} ") }
            .hasStackTraceContaining("cars_license_plate_unique_idx")
    }

    @Test
    fun `existsOtherWithLicensePlate sees enabled and disabled cars and ignores the car itself`() {
        val enabledPlate = plate()
        val disabledPlate = plate()
        val enabled = persist(enabledPlate)
        persist(disabledPlate, enabled = false)

        assertThat(carRepository.existsOtherWithLicensePlate(enabledPlate.lowercase(), null)).isTrue()
        assertThat(carRepository.existsOtherWithLicensePlate(disabledPlate, null)).isTrue()
        assertThat(carRepository.existsOtherWithLicensePlate(enabledPlate, enabled.id)).isFalse()
        assertThat(carRepository.existsOtherWithLicensePlate(plate(), null)).isFalse()
    }
}
