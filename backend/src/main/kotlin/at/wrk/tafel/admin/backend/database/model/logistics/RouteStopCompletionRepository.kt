package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface RouteStopCompletionRepository : JpaRepository<RouteStopCompletionEntity, Long> {

    fun findAllByRouteStopIdInAndCompletionDate(routeStopIds: List<Long>, completionDate: LocalDate): List<RouteStopCompletionEntity>

    fun findByRouteStopIdAndCompletionDate(routeStopId: Long, completionDate: LocalDate): RouteStopCompletionEntity?

    fun deleteByRouteStopIdAndCompletionDate(routeStopId: Long, completionDate: LocalDate): Long
}
