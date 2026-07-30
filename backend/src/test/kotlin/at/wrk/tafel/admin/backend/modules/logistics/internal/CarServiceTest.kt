package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.Car
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testCar2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class CarServiceTest {

    @RelaxedMockK
    private lateinit var carRepository: CarRepository

    @InjectMockKs
    private lateinit var service: CarService

    @Test
    fun `get active cars`() {
        every { carRepository.findByEnabledIsTrue() } returns listOf(testCar1, testCar2)

        val cars = service.getActiveCars()

        assertThat(cars).hasSize(2)
        assertThat(cars.first()).isEqualTo(
            Car(
                id = testCar1.id!!,
                licensePlate = testCar1.licensePlate!!,
                name = testCar1.name!!,
                enabled = testCar1.enabled!!,
                sortOrder = testCar1.sortOrder!!,
            ),
        )
    }

    @Test
    fun `get all cars`() {
        every { carRepository.findAll() } returns listOf(testCar1, testCar2)

        val cars = service.getAllCars()

        assertThat(cars).hasSize(2)
        assertThat(cars.first()).isEqualTo(
            Car(
                id = testCar1.id!!,
                licensePlate = testCar1.licensePlate!!,
                name = testCar1.name!!,
                enabled = testCar1.enabled!!,
                sortOrder = testCar1.sortOrder!!,
            ),
        )
    }

    @Test
    fun `update car`() {
        val existingEntity = CarEntity().apply {
            id = 99
            licensePlate = "Old Plate"
            name = "Old Car"
            enabled = true
            sortOrder = 1
        }
        val updated = Car(
            id = existingEntity.id!!,
            licensePlate = "Updated Plate",
            name = "Updated Car",
            enabled = false,
            sortOrder = 5,
        )

        every { carRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        val result = service.updateCar(existingEntity.id!!, updated)

        assertThat(result).isEqualTo(updated)
    }

    @Test
    fun `update car throws exception when not found`() {
        every { carRepository.findByIdOrNull(99L) } returns null

        assertThatThrownBy {
            service.updateCar(
                99L,
                Car(id = 99L, licensePlate = "X", name = "X", enabled = true, sortOrder = 1),
            )
        }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("Car with id 99 not found")
    }

    @Test
    fun `create car assigns next sort order after the current max, ignoring the input value`() {
        val createInput = Car(
            id = null,
            licensePlate = "New Plate",
            name = "New Car",
            enabled = true,
            sortOrder = 999,
        )

        every { carRepository.findAll() } returns listOf(testCar1, testCar2)
        every { carRepository.save(any()) } answers {
            val arg = firstArg() as CarEntity
            arg.id = 42
            arg
        }

        val result = service.createCar(createInput)

        assertThat(result).isEqualTo(
            Car(
                id = 42L,
                licensePlate = createInput.licensePlate,
                name = createInput.name,
                enabled = createInput.enabled,
                sortOrder = 3,
            ),
        )
    }

    @Test
    fun `create car assigns sort order 1 when no cars exist yet`() {
        val createInput = Car(
            id = null,
            licensePlate = "New Plate",
            name = "New Car",
            enabled = true,
            sortOrder = 999,
        )

        every { carRepository.findAll() } returns emptyList()
        every { carRepository.save(any()) } answers {
            val arg = firstArg() as CarEntity
            arg.id = 42
            arg
        }

        val result = service.createCar(createInput)

        assertThat(result.sortOrder).isEqualTo(1)
    }

    @Test
    fun `reorder cars assigns sequential sort order matching the given order`() {
        val entity1 = CarEntity().apply {
            id = 1
            sortOrder = 200
        }
        val entity2 = CarEntity().apply {
            id = 2
            sortOrder = 100
        }
        val entity3 = CarEntity().apply {
            id = 3
            sortOrder = 300
        }

        every { carRepository.findByIdOrNull(3L) } returns entity3
        every { carRepository.findByIdOrNull(1L) } returns entity1
        every { carRepository.findByIdOrNull(2L) } returns entity2
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        service.reorderCars(listOf(3L, 1L, 2L))

        assertThat(entity3.sortOrder).isEqualTo(1)
        assertThat(entity1.sortOrder).isEqualTo(2)
        assertThat(entity2.sortOrder).isEqualTo(3)
        verify(exactly = 3) { carRepository.save(any()) }
    }

    @Test
    fun `reorder cars throws exception when a car is not found`() {
        every { carRepository.findByIdOrNull(99L) } returns null

        assertThatThrownBy { service.reorderCars(listOf(99L)) }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("Car with id 99 not found")
    }
}
