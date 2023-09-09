package at.wrk.tafel.admin.backend.database.repositories.auth

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.query.Param
import java.util.*

interface UserRepository : JpaRepository<UserEntity, Long> {

    fun findByUsername(username: String): Optional<UserEntity>

    fun findByPersonnelNumber(personnelNumber: String): Optional<UserEntity>

    fun existsByUsername(username: String): Boolean

    fun findAllByFirstnameContainingIgnoreCase(
        @Param("firstname") firstname: String,
    ): List<UserEntity>

    fun findAllByLastnameContainingIgnoreCase(
        @Param("lastname") lastname: String
    ): List<UserEntity>

    fun findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(
        @Param("firstname") firstname: String,
        @Param("lastname") lastname: String
    ): List<UserEntity>

}
