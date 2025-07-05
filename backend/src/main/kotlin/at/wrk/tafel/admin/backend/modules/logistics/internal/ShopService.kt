package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.Shop
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShopService(
    private val routeRepository: RouteRepository
) {

    @Transactional
    fun getShopsForRouteId(routeId: Long): List<Shop> {
        val route =
            routeRepository.findByIdOrNull(routeId) ?: throw TafelValidationException("Route $routeId nicht gefunden!")
        return route.stops.sortedBy { it.time }
            .mapNotNull { it.shop }
            .map { shop ->
                Shop(
                    id = shop.id!!,
                    number = shop.number!!,
                    name = shop.name!!,
                    address = shop.address!!.let {
                        "${it.street}, ${it.postalCode} ${it.city}"
                    },
                )
            }
    }

}
