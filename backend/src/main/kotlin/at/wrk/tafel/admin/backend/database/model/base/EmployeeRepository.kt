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
     * Candidate ids for `EmployeeRetentionService` (GDPR gap G13) - every *inactive* employee, locked
     * for the caller's transaction so a second instance's poll skips an employee this one is already
     * deleting rather than racing it (see ADR-0047). An employee's own row is not what counts - it
     * hardly ever changes - but when they were last *used*: the newest food collection naming them as
     * driver or co-driver (`food_collections.driver_employee_id`/`co_driver_employee_id`, the only
     * tables with a foreign key onto `employees`), or the employee's `created_at` when no collection
     * ever did, so an employee entered and never used still ages out. Inactive means that moment lies
     * before [cutoff]. The references are `on delete set null`
     * (`R__00106_employee_delete_set_null.sql`), so the old collections keep existing and show
     * "Mitarbeiter gelöscht". Native and set-based because `FOR UPDATE SKIP LOCKED` has no
     * derived-query equivalent. Only the candidate ids, not the deletion itself - that goes through
     * `EmployeeService.deleteEmployee` for its logging.
     */
    @Query(
        value = """
            SELECT e.id FROM employees e
            WHERE COALESCE(
                      (SELECT MAX(fc.updated_at) FROM food_collections fc
                       WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id),
                      e.created_at
                  ) < :cutoff
            FOR UPDATE SKIP LOCKED
        """,
        nativeQuery = true,
    )
    fun findExpiredEmployeeIdsSkipLocked(@Param("cutoff") cutoff: LocalDateTime): List<Long>

    /**
     * How many employees have gone unused since before [cutoff] - the same measure as
     * [findExpiredEmployeeIdsSkipLocked], as a plain count without the row locks for the advance
     * warning to administrators (`RetentionExpiryReminderService`).
     */
    @Query(
        value = """
            SELECT COUNT(*) FROM employees e
            WHERE COALESCE(
                      (SELECT MAX(fc.updated_at) FROM food_collections fc
                       WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id),
                      e.created_at
                  ) < :cutoff
        """,
        nativeQuery = true,
    )
    fun countEmployeesLastUsedBefore(@Param("cutoff") cutoff: LocalDateTime): Long

    /**
     * The employees behind [countEmployeesLastUsedBefore], longest unused first, one page of [limit] rows
     * starting at [offset] - what the "Anstehende Löschungen" screen lists (`PendingDeletionsService`). Carries the two moments the
     * measure is made of: [EmployeeLastUseProjection.lastUsed] (the newest food collection naming the
     * employee, `null` when none ever did) and [EmployeeLastUseProjection.createdAt], which stands in
     * for it then.
     */
    @Query(
        value = """
            SELECT e.id AS id, e.personnel_number AS personnelNumber, e.firstname AS firstname,
                   e.lastname AS lastname, e.created_at AS createdAt,
                   (SELECT MAX(fc.updated_at) FROM food_collections fc
                    WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id) AS lastUsed
            FROM employees e
            WHERE COALESCE(
                      (SELECT MAX(fc.updated_at) FROM food_collections fc
                       WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id),
                      e.created_at
                  ) < :cutoff
            ORDER BY COALESCE(
                      (SELECT MAX(fc.updated_at) FROM food_collections fc
                       WHERE fc.driver_employee_id = e.id OR fc.co_driver_employee_id = e.id),
                      e.created_at
                  ) ASC, e.id ASC
            LIMIT :limit OFFSET :offset
        """,
        nativeQuery = true,
    )
    fun findEmployeesLastUsedBefore(
        @Param("cutoff") cutoff: LocalDateTime,
        @Param("limit") limit: Int,
        @Param("offset") offset: Int,
    ): List<EmployeeLastUseProjection>
}

/** One employee with the moments their last use is measured from, see [EmployeeRepository.findEmployeesLastUsedBefore]. */
interface EmployeeLastUseProjection {
    val id: Long
    val personnelNumber: String
    val firstname: String
    val lastname: String
    val createdAt: LocalDateTime
    val lastUsed: LocalDateTime?
}
