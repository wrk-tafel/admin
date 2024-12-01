package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Route
import at.wrk.tafel.admin.backend.modules.logistics.model.Shop
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testRoute2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class RouteServiceTest {

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @InjectMockKs
    private lateinit var service: RouteService

    @Test
    fun `get routes with proper mapping`() {
        val route1 = testRoute1
        val route2 = testRoute2
        every { routeRepository.findAll() } returns listOf(route1, route2)

        val routes = service.getRoutes()

        assertThat(routes).isEqualTo(
            listOf(
                Route(
                    id = route1.id!!,
                    name = route1.name!!,
                    shops = route1.stops
                        .filter { it.shop != null }
                        .map {
                            Shop(
                                id = it.shop!!.id!!,
                                name = it.shop!!.name!!
                            )
                        }
                ),
                Route(
                    id = route2.id!!,
                    name = route2.name!!,
                    shops = emptyList()
                )
            )
        )
    }

}
