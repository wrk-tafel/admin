package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopItem
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testRoute2
import at.wrk.tafel.admin.backend.modules.logistics.testShop1
import at.wrk.tafel.admin.backend.modules.logistics.testShop2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verifyOrder
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.time.LocalTime

@ExtendWith(MockKExtension::class)
class RouteServiceTest {

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var shopRepository: ShopRepository

    @InjectMockKs
    private lateinit var service: RouteService

    @Test
    fun `get active routes`() {
        every { routeRepository.findByEnabledIsTrue() } returns listOf(testRoute2, testRoute1)

        val routes = service.getActiveRoutes()

        assertThat(routes.map { it.name }).containsExactly("Route 1", "Route 2")
    }

    @Test
    fun `get all routes with proper mapping and stops sorted by time`() {
        every { routeRepository.findAll() } returns listOf(testRoute1, testRoute2)

        val routes = service.getAllRoutes()

        assertThat(routes).isEqualTo(
            listOf(
                RouteResponse(
                    id = testRoute1.id!!,
                    number = testRoute1.number,
                    name = testRoute1.name,
                    note = testRoute1.note,
                    enabled = true,
                    stops = listOf(
                        RouteStopItem(
                            id = 11,
                            time = LocalTime.MIDNIGHT.plusMinutes(15),
                            shopId = testShop2.id,
                            description = null,
                        ),
                        RouteStopItem(
                            id = 22,
                            time = LocalTime.MIDNIGHT.plusMinutes(30),
                            shopId = null,
                            description = "Extra stop at home",
                        ),
                        RouteStopItem(
                            id = 33,
                            time = LocalTime.MIDNIGHT.plusHours(5),
                            shopId = testShop1.id,
                            description = null,
                        ),
                    ),
                ),
                RouteResponse(
                    id = testRoute2.id!!,
                    number = testRoute2.number,
                    name = testRoute2.name,
                    note = null,
                    enabled = true,
                    stops = emptyList(),
                ),
            ),
        )
    }

    @Test
    fun `create route with stops`() {
        val request = RouteRequest(
            id = null,
            number = 5.1,
            name = "Route 5",
            note = "Note 5",
            enabled = true,
            stops = listOf(
                RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = testShop1.id, description = "First"),
                RouteStopItem(id = null, time = LocalTime.of(14, 30), shopId = null, description = "Pause"),
            ),
        )
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { routeRepository.save(any()) } answers {
            (firstArg() as RouteEntity).apply { id = 42 }
        }

        val result = service.createRoute(request)

        assertThat(result.id).isEqualTo(42)
        assertThat(result.number).isEqualTo(5.1)
        assertThat(result.name).isEqualTo("Route 5")
        assertThat(result.note).isEqualTo("Note 5")
        assertThat(result.stops).extracting<Long?> { it.shopId }.containsExactly(testShop1.id, null)
        assertThat(result.stops).extracting<String?> { it.description }.containsExactly("First", "Pause")
    }

    @Test
    fun `create route fails when a shop doesnt exist`() {
        val request = RouteRequest(
            id = null,
            number = 5.0,
            name = "Route 5",
            note = null,
            enabled = true,
            stops = listOf(RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = 999, description = null)),
        )
        every { shopRepository.findByIdOrNull(999L) } returns null

        val exception = assertThrows<NotFoundException> { service.createRoute(request) }

        assertThat(exception.body.detail).isEqualTo("Markt mit Id 999 nicht gefunden!")
    }

    @Test
    fun `create route fails when the same shop is used twice`() {
        val request = RouteRequest(
            id = null,
            number = 5.0,
            name = "Route 5",
            note = null,
            enabled = true,
            stops = listOf(
                RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = testShop1.id, description = null),
                RouteStopItem(id = null, time = LocalTime.of(15, 0), shopId = testShop1.id, description = null),
            ),
        )

        val exception = assertThrows<BusinessRuleException> { service.createRoute(request) }

        assertThat(exception.body.detail).isEqualTo("Ein Markt darf pro Route nur einmal vorkommen!")
    }

    @Test
    fun `create route fails when two stops share the same time`() {
        val request = RouteRequest(
            id = null,
            number = 5.0,
            name = "Route 5",
            note = null,
            enabled = true,
            stops = listOf(
                RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = testShop1.id, description = null),
                RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = testShop2.id, description = null),
            ),
        )

        val exception = assertThrows<BusinessRuleException> { service.createRoute(request) }

        assertThat(exception.body.detail).isEqualTo("Pro Route darf es je Uhrzeit nur einen Stopp geben!")
    }

    @Test
    fun `update route replaces the stops and flushes the removals before inserting`() {
        val existingEntity = RouteEntity(number = 1.0, name = "Old Route").apply {
            id = 99
            note = "Old note"
            stops = mutableListOf(
                RouteStopEntity(route = this, time = LocalTime.of(9, 0)).apply {
                    id = 1
                    shop = testShop1
                },
            )
        }
        val request = RouteRequest(
            id = 99,
            number = 2.5,
            name = "New Route",
            note = "New note",
            enabled = false,
            // re-uses the removed stop's shop and time, which only works if the delete is flushed first
            stops = listOf(RouteStopItem(id = null, time = LocalTime.of(9, 0), shopId = testShop1.id, description = "Updated")),
        )
        every { routeRepository.findByIdOrNull(99L) } returns existingEntity
        every { shopRepository.findByIdOrNull(testShop1.id!!) } returns testShop1
        every { routeRepository.saveAndFlush(any()) } answers { firstArg() as RouteEntity }
        every { routeRepository.save(any()) } answers { firstArg() as RouteEntity }

        val result = service.updateRoute(99L, request)

        assertThat(result).isEqualTo(
            RouteResponse(
                id = 99,
                number = 2.5,
                name = "New Route",
                note = "New note",
                enabled = false,
                stops = listOf(
                    RouteStopItem(id = null, time = LocalTime.of(9, 0), shopId = testShop1.id, description = "Updated"),
                ),
            ),
        )
        verifyOrder {
            routeRepository.saveAndFlush(any())
            routeRepository.save(any())
        }
    }

    @Test
    fun `update route throws exception when not found`() {
        every { routeRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.updateRoute(
                99L,
                RouteRequest(id = 99, number = 1.0, name = "X", note = null, enabled = true, stops = emptyList()),
            )
        }

        assertThat(exception.body.detail).isEqualTo("Route with id 99 not found")
    }
}
