package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.CarRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.CarRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.CarResponse
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testCar2
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
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
            CarResponse(
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
            CarResponse(
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
        val existingEntity = CarEntity(licensePlate = "W-OLD-1", sortOrder = 1, enabled = true).apply {
            id = 99
            name = "Old Car"
        }
        val updated = CarRequest(
            id = existingEntity.id!!,
            licensePlate = "W-UPD-1",
            name = "Updated Car",
            enabled = false,
            sortOrder = 5,
        )

        every { carRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        val result = service.updateCar(existingEntity.id!!, updated)

        assertThat(result).isEqualTo(
            CarResponse(
                id = updated.id,
                licensePlate = updated.licensePlate,
                name = updated.name,
                enabled = updated.enabled,
                sortOrder = updated.sortOrder,
            ),
        )
    }

    @Test
    fun `update car throws exception when not found`() {
        every { carRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.updateCar(
                99L,
                CarRequest(id = 99L, licensePlate = "X", name = "X", enabled = true, sortOrder = 1),
            )
        }
        assertThat(exception.body.detail).isEqualTo("Car with id 99 not found")
    }

    @Test
    fun `create car assigns next sort order after the current max, ignoring the input value`() {
        val createInput = CarRequest(
            id = null,
            licensePlate = "W-NEW-1",
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
            CarResponse(
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
        val createInput = CarRequest(
            id = null,
            licensePlate = "W-NEW-1",
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
    fun `create car normalizes the license plate and trims the name`() {
        val createInput = CarRequest(
            id = null,
            licensePlate = "  w-12345x ",
            name = "  Bus 1  ",
            enabled = true,
            sortOrder = 0,
        )

        every { carRepository.findAll() } returns emptyList()
        every { carRepository.save(any()) } answers {
            val arg = firstArg() as CarEntity
            arg.id = 42
            arg
        }

        val result = service.createCar(createInput)

        assertThat(result.licensePlate).isEqualTo("W-12345X")
        assertThat(result.name).isEqualTo("Bus 1")
    }

    @Test
    fun `update car normalizes the license plate and trims the name`() {
        val existingEntity = CarEntity(licensePlate = "W-11111A", sortOrder = 1, enabled = true).apply {
            id = 99
            name = "Old Car"
        }
        val updated = CarRequest(
            id = existingEntity.id!!,
            licensePlate = " w-12345x",
            name = "Bus 1 ",
            enabled = true,
            sortOrder = 1,
        )

        every { carRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        val result = service.updateCar(existingEntity.id!!, updated)

        assertThat(result.licensePlate).isEqualTo("W-12345X")
        assertThat(result.name).isEqualTo("Bus 1")
    }

    @Test
    fun `reorder cars assigns sequential sort order matching the given order`() {
        val entity1 = CarEntity(licensePlate = "Plate 1", sortOrder = 200).apply {
            id = 1
        }
        val entity2 = CarEntity(licensePlate = "Plate 2", sortOrder = 100).apply {
            id = 2
        }
        val entity3 = CarEntity(licensePlate = "Plate 3", sortOrder = 300).apply {
            id = 3
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

        val exception = assertThrows<NotFoundException> { service.reorderCars(listOf(99L)) }
        assertThat(exception.body.detail).isEqualTo("Car with id 99 not found")
    }

    @Test
    fun `create car logs the creation`() {
        val createInput = CarRequest(id = null, licensePlate = "W-NEW-1", name = "New Car", enabled = true, sortOrder = 999)
        every { carRepository.findAll() } returns emptyList()
        every { carRepository.save(any()) } answers {
            val arg = firstArg() as CarEntity
            arg.id = 42
            arg
        }

        withLogAppender(CarService::class.java) { logAppender ->
            service.createCar(createInput)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Created car").contains("42").contains("W-NEW-1")
            }
        }
    }

    @Test
    fun `update car logs the update`() {
        val existingEntity = CarEntity(licensePlate = "W-OLD-1", sortOrder = 1, enabled = true).apply {
            id = 99
            name = "Old Car"
        }
        val updated = CarRequest(id = existingEntity.id!!, licensePlate = "W-UPD-1", name = "Updated Car", enabled = false, sortOrder = 5)
        every { carRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        withLogAppender(CarService::class.java) { logAppender ->
            service.updateCar(existingEntity.id!!, updated)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Updated car").contains("99").contains("W-UPD-1")
            }
        }
    }

    @Test
    fun `reorder cars logs the new order`() {
        val entity1 = CarEntity(licensePlate = "Plate 1", sortOrder = 200).apply { id = 1 }
        every { carRepository.findByIdOrNull(1L) } returns entity1
        every { carRepository.save(any()) } answers { firstArg() as CarEntity }

        withLogAppender(CarService::class.java) { logAppender ->
            service.reorderCars(listOf(1L))

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Reordered cars").contains("[1]")
            }
        }
    }

    private fun withLogAppender(loggerClass: Class<*>, block: (ListAppender<ILoggingEvent>) -> Unit) {
        val logger = LoggerFactory.getLogger(loggerClass) as Logger
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
        try {
            block(logAppender)
        } finally {
            logger.detachAppender(logAppender)
        }
    }
}
