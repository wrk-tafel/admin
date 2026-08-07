package at.wrk.tafel.admin.backend.database.model.push

import org.springframework.data.jpa.repository.JpaRepository

interface PushPreferencesRepository : JpaRepository<PushPreferencesEntity, Long> {

    fun findByUserId(userId: Long): PushPreferencesEntity?
}
