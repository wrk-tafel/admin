package at.wrk.tafel.admin.backend.database.repositories.base

import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.EmployeeEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface EmployeeRepository : JpaRepository<EmployeeEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    fun findByPersonnelNumber(personnelNumber: String): EmployeeEntity?

}
