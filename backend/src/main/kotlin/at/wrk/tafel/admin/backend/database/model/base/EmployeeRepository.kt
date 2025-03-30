package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query

interface EmployeeRepository : JpaRepository<EmployeeEntity, Long>, JpaSpecificationExecutor<UserEntity> {

    fun findByPersonnelNumber(personnelNumber: String): EmployeeEntity?
    fun existsByPersonnelNumber(personnelNumber: String): Boolean

    @Query("select emp from Employee emp where lower(emp.personnelNumber) like lower(concat('%', :searchInput, '%')) or lower(emp.firstname) like lower(concat('%', :searchInput, '%')) or lower(emp.lastname) like lower(concat('%', :searchInput, '%'))")
    fun findBySearchInput(searchInput: String, pageRequest: PageRequest): Page<EmployeeEntity>

}
