package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteService
import at.wrk.tafel.admin.backend.modules.logistics.internal.ShopService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopsResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopItem
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalTime

@ExtendWith(MockKExtension::class)
class RouteControllerTest {

    @RelaxedMockK
    private lateinit var routeService: RouteService

    @RelaxedMockK
    private lateinit var shopService: ShopService

    @InjectMockKs
    private lateinit var controller: RouteController

    private val route1 = RouteResponse(
        id = 1,
        number = 1.0,
        name = "Route 1",
        note = "Note 1",
        enabled = true,
        stops = listOf(RouteStopItem(id = 11, time = LocalTime.of(14, 0), shopId = 1, description = null)),
    )
    private val route2 = RouteResponse(
        id = 2,
        number = 2.0,
        name = "Route 2",
        note = null,
        enabled = false,
        stops = emptyList(),
    )

    @Test
    fun `get active routes`() {
        every { routeService.getActiveRoutes() } returns listOf(route1)

        val response = controller.getActiveRoutes()

        assertThat(response).isEqualTo(RouteListResponse(routes = listOf(route1)))
    }

    @Test
    fun `get all routes`() {
        every { routeService.getAllRoutes() } returns listOf(route1, route2)

        val response = controller.getAllRoutes()

        assertThat(response).isEqualTo(RouteListResponse(routes = listOf(route1, route2)))
    }

    @Test
    fun `create route`() {
        val newRoute = RouteRequest(
            id = null,
            number = 3.0,
            name = "Route 3",
            note = null,
            enabled = true,
            stops = emptyList(),
        )
        val createdRoute = route1.copy(id = 42, number = newRoute.number, name = newRoute.name, note = null, stops = emptyList())
        every { routeService.createRoute(any()) } returns createdRoute

        val response = controller.createRoute(newRoute)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(createdRoute)
        verify { routeService.createRoute(newRoute) }
    }

    @Test
    fun `update route`() {
        val updatedRoute = RouteRequest(
            id = 1,
            number = 1.5,
            name = "Route 1 updated",
            note = "Updated",
            enabled = false,
            stops = listOf(RouteStopItem(id = null, time = LocalTime.of(15, 0), shopId = 2, description = "Stop")),
        )
        val updatedResponse = route1.copy(number = 1.5, name = "Route 1 updated", note = "Updated", enabled = false)
        every { routeService.updateRoute(any(), any()) } returns updatedResponse

        val response = controller.updateRoute(1L, updatedRoute)

        assertThat(response).isEqualTo(updatedResponse)
        verify { routeService.updateRoute(1L, updatedRoute) }
    }

    @Test
    fun `get shops of route`() {
        val routeId = testRoute1.id!!
        val shopList = listOf(
            RouteShopItem(id = 1, number = 111, name = "Billa", address = "Street 1, 1010 City"),
            RouteShopItem(id = 2, number = 222, name = "Hofer", address = "Street 2, 1020 City"),
        )
        every { shopService.getShopsForRouteId(routeId) } returns shopList

        val routeShopsResponse = controller.getShopsOfRoute(routeId)

        assertThat(routeShopsResponse).isEqualTo(RouteShopsResponse(shops = shopList))
    }
}
