package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import org.springframework.data.jpa.repository.JpaRepository

interface FoodCollectionRepository : JpaRepository<FoodCollectionEntity, Long> {

    fun existsByDistributionAndRoute(distribution: DistributionEntity, route: RouteEntity): Boolean

}
