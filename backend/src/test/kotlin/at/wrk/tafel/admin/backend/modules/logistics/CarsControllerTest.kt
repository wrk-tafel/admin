package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.CarService
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class CarsControllerTest {

    @RelaxedMockK
    private lateinit var carService: CarService

    @InjectMockKs
    private lateinit var controller: CarsController

    @Test
    fun `get all cars`() {
        val car1 = Car(id = 1, licensePlate = "123", name = "Car 123")
        val car2 = Car(id = 2, licensePlate = "456", name = "Car 456")

        every { carService.getCars() } returns listOf(car1, car2)

        val response = controller.getCars()

        assertThat(response.cars).hasSize(2)
        assertThat(response.cars.first()).isEqualTo(car1)
    }

}
