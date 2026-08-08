package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface FoodCollectionRepository : JpaRepository<FoodCollectionEntity, Long> {

    /**
     * Queried directly rather than read off `DistributionEntity.foodCollections`, so the result
     * includes a collection saved moments ago in the same transaction - the already-loaded lazy
     * list on the distribution would not.
     */
    fun findAllByDistributionId(distributionId: Long): List<FoodCollectionEntity>
}
