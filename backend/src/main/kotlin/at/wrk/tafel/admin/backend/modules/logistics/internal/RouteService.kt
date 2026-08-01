package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteItem
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RouteService(
    private val routeRepository: RouteRepository,
) {

    @Transactional(readOnly = true)
    fun getRoutes(): List<RouteItem> {
        val routes: List<RouteEntity> = routeRepository.findAll()
        return routes.map { mapRoute(it) }
    }

    private fun mapRoute(routeEntity: RouteEntity): RouteItem = RouteItem(
        id = routeEntity.id!!,
        name = routeEntity.name!!,
    )
}
