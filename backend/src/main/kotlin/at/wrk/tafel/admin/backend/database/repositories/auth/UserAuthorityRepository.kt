package at.wrk.tafel.admin.backend.database.repositories.auth

import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import org.springframework.data.jpa.repository.JpaRepository

interface UserAuthorityRepository : JpaRepository<UserAuthorityEntity, Long> {
}
