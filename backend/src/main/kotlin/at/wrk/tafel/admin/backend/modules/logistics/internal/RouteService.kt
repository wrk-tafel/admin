package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Route
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RouteService(
    private val routeRepository: RouteRepository
) {

    @Transactional
    fun getRoutes(): List<Route> {
        val routes = routeRepository.findAll()
        return routes.map { mapRoute(it) }
    }

    private fun mapRoute(routeEntity: RouteEntity): Route {
        return Route(
            id = routeEntity.id!!,
            name = routeEntity.name!!
        )
    }

}
