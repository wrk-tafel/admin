package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeExportService
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import org.springframework.stereotype.Service

/**
 * The cross-module surface the central data-subject-request screen (issue #3396) triggers an
 * employee's own export/delete through, without reaching into this module's `.internal` package -
 * Spring Modulith never exposes an `.internal` type to another module, `employee` named interface
 * or not.
 */
@Service
class EmployeeDataSubjectFacade(
    private val employeeService: EmployeeService,
    private val employeeExportService: EmployeeExportService,
) {

    fun export(employeeId: Long): ExportFileResult? = employeeExportService.exportEmployeeById(employeeId)
        ?.let { ExportFileResult(filename = it.filename, bytes = it.bytes) }

    /**
     * Delegates as-is to [EmployeeService.deleteEmployee] - same [at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException]/
     * [at.wrk.tafel.admin.backend.modules.base.exception.ConflictException] behavior (linked user account) as the Mitarbeiter settings screen's own delete.
     */
    fun delete(employeeId: Long) = employeeService.deleteEmployee(employeeId)
}
