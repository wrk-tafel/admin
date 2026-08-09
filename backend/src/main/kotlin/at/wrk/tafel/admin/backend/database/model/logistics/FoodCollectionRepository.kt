package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface FoodCollectionRepository : JpaRepository<FoodCollectionEntity, Long> {

    /**
     * Queried directly rather than read off `DistributionEntity.foodCollections`, so the result
     * includes a collection saved moments ago in the same transaction - the already-loaded lazy
     * list on the distribution would not.
     */
    fun findAllByDistributionId(distributionId: Long): List<FoodCollectionEntity>

    /**
     * The route's most recent collection from a distribution other than the given one - the trip
     * whose return boxes are still standing in the hall waiting to go back. The exclusion is what
     * makes it "the last one": a collection row for the running distribution is created as soon as
     * anyone opens the recording screen, so without it the newest row would be today's own, empty
     * one. Pass `-1` when no distribution is running, so nothing is excluded.
     */
    fun findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc(
        routeId: Long,
        distributionId: Long,
    ): FoodCollectionEntity?
}
