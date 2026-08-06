package at.wrk.tafel.admin.backend.database.model.push

import org.springframework.data.jpa.repository.JpaRepository

interface PushSubscriptionRepository : JpaRepository<PushSubscriptionEntity, Long> {

    fun findAllByUserId(userId: Long): List<PushSubscriptionEntity>

    fun findByEndpoint(endpoint: String): PushSubscriptionEntity?

    fun deleteByIdAndUserId(id: Long, userId: Long): Long
}
