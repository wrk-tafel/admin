package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository

interface UserPreferencesRepository : JpaRepository<UserPreferencesEntity, Long> {

    fun findByUserId(userId: Long): UserPreferencesEntity?
}
