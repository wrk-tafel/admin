package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopItem
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RouteService(
    private val routeRepository: RouteRepository,
    private val shopRepository: ShopRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(RouteService::class.java)
    }

    @Transactional(readOnly = true)
    fun getActiveRoutes(): List<RouteResponse> = routeRepository.findByEnabledIsTrue()
        .map { mapRoute(it) }
        .sortedWith(compareBy({ it.number }, { it.name }))

    @Transactional(readOnly = true)
    fun getAllRoutes(): List<RouteResponse> = routeRepository.findAll()
        .map { mapRoute(it) }
        .sortedWith(compareBy({ it.number }, { it.name }))

    @Transactional
    fun createRoute(route: RouteRequest): RouteResponse {
        validateStops(route.stops)

        val routeEntity = RouteEntity(
            number = route.number,
            name = route.name,
            enabled = route.enabled,
        ).apply {
            note = route.note
        }
        routeEntity.stops.addAll(route.stops.map { mapStopToEntity(it, routeEntity) })

        val savedEntity = routeRepository.save(routeEntity)
        log.info("Created route {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapRoute(savedEntity)
    }

    @Transactional
    fun updateRoute(routeId: Long, updatedRoute: RouteRequest): RouteResponse {
        validateStops(updatedRoute.stops)

        val routeEntity = routeRepository.findByIdOrNull(routeId)
            ?: throw NotFoundException("Route with id $routeId not found")

        routeEntity.number = updatedRoute.number
        routeEntity.name = updatedRoute.name
        routeEntity.note = updatedRoute.note
        routeEntity.enabled = updatedRoute.enabled

        // Stops are replaced wholesale instead of diffed. The delete has to hit the database
        // before the new rows are inserted, otherwise re-using a shop or a time that one of the
        // removed stops still occupies violates routes_stops' unique constraints - hence the
        // explicit flush between clearing and re-adding.
        routeEntity.stops.clear()
        routeRepository.saveAndFlush(routeEntity)
        routeEntity.stops.addAll(updatedRoute.stops.map { mapStopToEntity(it, routeEntity) })

        val savedEntity = routeRepository.save(routeEntity)
        log.info("Updated route {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapRoute(savedEntity)
    }

    private fun validateStops(stops: List<RouteStopItem>) {
        val shopIds = stops.mapNotNull { it.shopId }
        if (shopIds.size != shopIds.distinct().size) {
            throw BusinessRuleException("Eine Filiale darf pro Route nur einmal vorkommen!")
        }

        val times = stops.map { it.time }
        if (times.size != times.distinct().size) {
            throw BusinessRuleException("Pro Route darf es je Uhrzeit nur einen Stopp geben!")
        }
    }

    private fun mapStopToEntity(stop: RouteStopItem, routeEntity: RouteEntity): RouteStopEntity = RouteStopEntity(route = routeEntity, time = stop.time).apply {
        shop = stop.shopId?.let {
            shopRepository.findByIdOrNull(it) ?: throw NotFoundException("Filiale mit Id $it nicht gefunden!")
        }
        description = stop.description
    }

    private fun mapRoute(routeEntity: RouteEntity): RouteResponse = RouteResponse(
        id = routeEntity.id!!,
        number = routeEntity.number,
        name = routeEntity.name,
        note = routeEntity.note,
        enabled = routeEntity.enabled,
        stops = routeEntity.stops.sortedBy { it.time }.map { stop ->
            RouteStopItem(
                id = stop.id,
                time = stop.time,
                shopId = stop.shop?.id,
                description = stop.description,
            )
        },
    )
}
