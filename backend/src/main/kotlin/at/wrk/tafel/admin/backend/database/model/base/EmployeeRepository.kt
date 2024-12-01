package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface EmployeeRepository : JpaRepository<EmployeeEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    fun findByPersonnelNumber(personnelNumber: String): EmployeeEntity?
    fun existsByPersonnelNumber(personnelNumber: String): Boolean

}
