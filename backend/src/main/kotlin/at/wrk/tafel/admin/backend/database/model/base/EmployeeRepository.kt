package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface EmployeeRepository :
    JpaRepository<EmployeeEntity, Long>,
    JpaSpecificationExecutor<UserEntity> {

    fun findByPersonnelNumber(personnelNumber: String): EmployeeEntity?
    fun existsByPersonnelNumber(personnelNumber: String): Boolean
    fun existsByPersonnelNumberAndIdNot(personnelNumber: String, id: Long): Boolean

    @Query("select emp from Employee emp where lower(emp.personnelNumber) like lower(concat('%', :searchInput, '%')) or lower(emp.firstname) like lower(concat('%', :searchInput, '%')) or lower(emp.lastname) like lower(concat('%', :searchInput, '%')) order by emp.id")
    fun findBySearchInput(searchInput: String, pageRequest: PageRequest): Page<EmployeeEntity>

    /**
     * Candidate ids for `EmployeeRetentionService` (GDPR gap G13) - every employee with no linked
     * user account whose row hasn't been written to since before [cutoff], locked for the caller's
     * transaction so a second instance's poll skips an employee this one is already deleting rather
     * than racing it (see ADR-0047). Native and set-based because `FOR UPDATE SKIP LOCKED` has no
     * derived-query equivalent. Only the candidate ids, not the deletion itself - that goes through
     * `EmployeeService.deleteEmployee` for its own guard against a linked account and its logging.
     */
    @Query(
        value = """
            SELECT e.id FROM employees e
            WHERE e.updated_at < :cutoff
              AND NOT EXISTS (SELECT 1 FROM users u WHERE u.employee_id = e.id)
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findExpiredEmployeeIdsSkipLocked(@Param("cutoff") cutoff: LocalDateTime): List<Long>
}
