package at.wrk.tafel.admin.backend.database.model.base

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface EmployeeRepository :
    JpaRepository<EmployeeEntity, Long>,
    JpaSpecificationExecutor<EmployeeEntity> {

    fun findByPersonnelNumber(personnelNumber: String): EmployeeEntity?
    fun existsByPersonnelNumber(personnelNumber: String): Boolean
    fun existsByPersonnelNumberAndIdNot(personnelNumber: String, id: Long): Boolean

    /**
     * Candidate ids for `EmployeeRetentionService` (GDPR gap G13) - every employee not referenced by
     * any other table whose row hasn't been written to since before [cutoff], locked for the caller's
     * transaction so a second instance's poll skips an employee this one is already deleting rather
     * than racing it (see ADR-0047). This is every table with a foreign key onto `employees` today:
     * `users.employee_id` (the identity behind a login - not-null, so a linked employee is never a
     * candidate, mirroring `EmployeeService.deleteEmployee`'s own guard), the household issuer
     * (`households.employee_id`), a household note's author (`household_notes.employee_id`), a food
     * collection's driver/co-driver (`food_collections.driver_employee_id`/`co_driver_employee_id`),
     * and a route stop completion's recorder (`routes_stops_completions.employee_id`) - see
     * `R__00106_employee_delete_set_null.sql` for why every one of those except `users` tolerates
     * `ON DELETE SET NULL` and still shows "Mitarbeiter gelöscht" for a manual delete: this job is
     * deliberately *stricter* than that manual delete, since silently blanking a reference on a
     * household or food collection that is itself well within its own retention window would erase
     * part of a still-live record rather than an abandoned one. Native and set-based because
     * `FOR UPDATE SKIP LOCKED` has no derived-query equivalent. Only the candidate ids, not the
     * deletion itself - that goes through `EmployeeService.deleteEmployee` for its logging.
     */
    @Query(
        value = """
            SELECT e.id FROM employees e
            WHERE e.updated_at < :cutoff
              AND NOT EXISTS (SELECT 1 FROM users u WHERE u.employee_id = e.id)
              AND NOT EXISTS (SELECT 1 FROM households h WHERE h.employee_id = e.id)
              AND NOT EXISTS (SELECT 1 FROM household_notes n WHERE n.employee_id = e.id)
              AND NOT EXISTS (
                  SELECT 1 FROM food_collections fc
                  WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id
              )
              AND NOT EXISTS (SELECT 1 FROM routes_stops_completions rsc WHERE rsc.employee_id = e.id)
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findExpiredEmployeeIdsSkipLocked(@Param("cutoff") cutoff: LocalDateTime): List<Long>

    /**
     * Whether [employeeId] is still referenced by anything other than a `users` row - the same
     * tables [findExpiredEmployeeIdsSkipLocked] checks, minus `users` itself. Used by the
     * data-subject-request erasure (issue #3423) to decide whether the employee record behind a
     * just-deleted user account can be deleted immediately rather than only reachable through
     * [findExpiredEmployeeIdsSkipLocked]'s own age-gated sweep, up to `tafeladmin.employeeDeletion.retentionTime`
     * (7 years by default) later.
     */
    @Query(
        value = """
            SELECT EXISTS (
                SELECT 1 FROM households h WHERE h.employee_id = :employeeId
                UNION ALL
                SELECT 1 FROM household_notes n WHERE n.employee_id = :employeeId
                UNION ALL
                SELECT 1 FROM food_collections fc
                WHERE fc.driver_employee_id = :employeeId OR fc.co_driver_employee_id = :employeeId
                UNION ALL
                SELECT 1 FROM routes_stops_completions rsc WHERE rsc.employee_id = :employeeId
            )
        """,
        nativeQuery = true,
    )
    fun isReferencedOutsideUserAccounts(@Param("employeeId") employeeId: Long): Boolean
}
