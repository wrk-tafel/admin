package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.Shop
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class ShopServiceTest {

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @InjectMockKs
    private lateinit var service: ShopService

    @Test
    fun `get shops for route when route doesnt exist`() {
        val routeId = testRoute1.id!!
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<TafelValidationException> {
            service.getShopsForRouteId(routeId)
        }

        assertThat(exception.message).isEqualTo("Route $routeId nicht gefunden!")
    }

    @Test
    fun `get shops with proper mapping`() {
        val routeId = testRoute1.id!!
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val shops = service.getShopsForRouteId(routeId)

        assertThat(shops).isEqualTo(
            testRoute1.stops
                .sortedBy { it.time }
                .filter { it.shop != null }
                .map {
                    Shop(
                        id = it.shop!!.id!!,
                        number = it.shop!!.number!!,
                        name = it.shop!!.name!!,
                        address = "${it.shop!!.address!!.street}, ${it.shop!!.address!!.postalCode} ${it.shop!!.address!!.city}"
                    )
                }
        )
    }

}
