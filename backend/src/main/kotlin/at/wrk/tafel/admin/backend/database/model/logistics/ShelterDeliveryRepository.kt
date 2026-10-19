package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface ShelterDeliveryRepository : JpaRepository<ShelterDeliveryEntity, Long> {

    fun findAllByFoodCollectionIdIn(foodCollectionIds: Collection<Long>): List<ShelterDeliveryEntity>

    fun findByFoodCollectionIdAndShelterId(foodCollectionId: Long, shelterId: Long): ShelterDeliveryEntity?
}
