package at.wrk.tafel.admin.backend.database.repositories.auth

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface UserRepository : JpaRepository<UserEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    fun findByUsername(username: String): UserEntity?

    fun findByEmployeePersonnelNumber(personnelNumber: String): UserEntity?

    fun existsByUsername(username: String): Boolean

}
