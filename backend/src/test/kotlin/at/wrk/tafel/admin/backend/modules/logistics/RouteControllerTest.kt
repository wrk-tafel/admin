package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteService
import at.wrk.tafel.admin.backend.modules.logistics.model.Route
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.Shop
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class RouteControllerTest {

    @RelaxedMockK
    private lateinit var routeService: RouteService

    @InjectMockKs
    private lateinit var controller: RouteController

    @Test
    fun `get routes`() {
        val route1 = Route(
            id = 1,
            name = "Route 1",
            shops = listOf(
                Shop(id = 1, name = "Billa"),
                Shop(id = 2, name = "Hofer")
            )
        )
        val route2 = Route(
            id = 2,
            name = "Route 2",
            shops = emptyList()
        )
        every { routeService.getRoutes() } returns listOf(route1, route2)

        val routeListing = controller.getRoutes()

        assertThat(routeListing).isEqualTo(
            RouteListResponse(
                routes = listOf(
                    route1,
                    route2
                )
            )
        )
    }

}
