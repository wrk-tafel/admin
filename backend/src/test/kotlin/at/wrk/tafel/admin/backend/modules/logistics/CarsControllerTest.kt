package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.CarService
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import at.wrk.tafel.admin.backend.modules.logistics.model.CarListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.CarReorderRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
class CarsControllerTest {

    @RelaxedMockK
    private lateinit var carService: CarService

    @InjectMockKs
    private lateinit var controller: CarsController

    @Test
    fun `get active cars`() {
        val car1 = Car(id = 1, licensePlate = "123", name = "Car 123", enabled = true, sortOrder = 1)
        val car2 = Car(id = 2, licensePlate = "456", name = "Car 456", enabled = true, sortOrder = 2)

        every { carService.getActiveCars() } returns listOf(car1, car2)

        val response = controller.getActiveCars()

        assertThat(response.cars).hasSize(2)
        assertThat(response.cars.first()).isEqualTo(car1)
    }

    @Test
    fun `get all cars`() {
        val car1 = Car(id = 1, licensePlate = "123", name = "Car 123", enabled = true, sortOrder = 1)
        val car2 = Car(id = 2, licensePlate = "456", name = "Car 456", enabled = false, sortOrder = 2)

        every { carService.getAllCars() } returns listOf(car1, car2)

        val response = controller.getAllCars()

        assertThat(response.cars).hasSize(2)
        assertThat(response.cars.first()).isEqualTo(car1)
    }

    @Test
    fun `update car`() {
        val existingCar = Car(id = 1, licensePlate = "123", name = "Car 123", enabled = true, sortOrder = 1)
        val updatedCar = existingCar.copy(licensePlate = "456", name = "Car 456", enabled = false)

        every { carService.updateCar(any(), any()) } returns updatedCar

        val response = controller.updateCar(existingCar.id!!, updatedCar)

        assertThat(response).isEqualTo(updatedCar)
        verify {
            carService.updateCar(existingCar.id, updatedCar)
        }
    }

    @Test
    fun `create car`() {
        val newCar = Car(id = null, licensePlate = "New Plate", name = "New Car", enabled = true, sortOrder = 0)
        val createdCar = newCar.copy(id = 42L, sortOrder = 1)

        every { carService.createCar(any()) } returns createdCar

        val response = controller.createCar(newCar)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(createdCar)
        verify {
            carService.createCar(newCar)
        }
    }

    @Test
    fun `reorder cars`() {
        val car1 = Car(id = 1, licensePlate = "123", name = "Car 123", enabled = true, sortOrder = 2)
        val car2 = car1.copy(id = 2, name = "Car 456", sortOrder = 1)
        val request = CarReorderRequest(carIds = listOf(2L, 1L))

        every { carService.reorderCars(request.carIds) } returns Unit
        every { carService.getAllCars() } returns listOf(car2, car1)

        val response = controller.reorderCars(request)

        assertThat(response).isEqualTo(
            CarListResponse(cars = listOf(car2, car1)),
        )
        verify { carService.reorderCars(request.carIds) }
    }
}
