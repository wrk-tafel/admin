package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testCar2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class CarServiceTest {

    @RelaxedMockK
    private lateinit var carRepository: CarRepository

    @InjectMockKs
    private lateinit var service: CarService

    @Test
    fun `get all cars`() {
        every { carRepository.findAll() } returns listOf(testCar1, testCar2)

        val cars = service.getCars()

        assertThat(cars).hasSize(2)
        assertThat(cars.first()).isEqualTo(
            Car(
                id = testCar1.id!!,
                licensePlate = testCar1.licensePlate!!,
                name = testCar1.name!!
            )
        )
    }

}
