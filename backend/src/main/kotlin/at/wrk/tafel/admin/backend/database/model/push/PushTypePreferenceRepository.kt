package at.wrk.tafel.admin.backend.database.model.push

import org.springframework.data.jpa.repository.JpaRepository

interface PushTypePreferenceRepository : JpaRepository<PushTypePreferenceEntity, Long> {

    fun findAllByUserId(userId: Long): List<PushTypePreferenceEntity>

    fun findByUserIdAndNotificationType(userId: Long, notificationType: PushNotificationType): PushTypePreferenceEntity?
}
