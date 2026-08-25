package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeExportService
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import jakarta.validation.Valid
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/employees")
@PreAuthorize("hasAuthority('LOGISTICS') or hasAuthority('SETTINGS')")
class EmployeeController(
    private val employeeService: EmployeeService,
    private val employeeExportService: EmployeeExportService,
) {

    @GetMapping
    fun findEmployees(
        @RequestParam searchInput: String? = null,
        @RequestParam page: Int? = null,
        @RequestParam pageSize: Int? = null,
    ): EmployeeListResponse = employeeService.findEmployees(searchInput, page, pageSize)

    @GetMapping("/personnel-number-availability")
    fun checkPersonnelNumberAvailability(
        @RequestParam personnelNumber: String,
        @RequestParam excludedEmployeeId: Long? = null,
    ): PersonnelNumberAvailabilityResponse = employeeService.checkPersonnelNumberAvailability(personnelNumber, excludedEmployeeId)

    @PostMapping
    fun saveEmployee(
        @Valid @RequestBody employeeRequest: EmployeeRequest,
    ): ResponseEntity<EmployeeResponse> = ResponseEntity.status(HttpStatus.CREATED).body(employeeService.saveEmployee(employeeRequest))

    @PutMapping("/{employeeId}")
    fun updateEmployee(
        @PathVariable employeeId: Long,
        @Valid @RequestBody employeeRequest: EmployeeRequest,
    ): EmployeeResponse = employeeService.updateEmployee(employeeId, employeeRequest)

    @DeleteMapping("/{employeeId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun deleteEmployee(
        @PathVariable employeeId: Long,
    ): ResponseEntity<Unit> {
        employeeService.deleteEmployee(employeeId)
        return ResponseEntity.noContent().build()
    }

    /**
     * The GDPR Art. 15/20 data takeout (issue #3394) for an employee with no linked `users` account -
     * the gap `UserController.exportUserById` (issue #3363) leaves open, since that one is keyed by a
     * `userId` that such an employee never has. Behind `SETTINGS` rather than the class-level
     * `LOGISTICS or SETTINGS`, same override pattern as [deleteEmployee].
     */
    @GetMapping("/{employeeId}/export", produces = [MediaType.APPLICATION_PDF_VALUE])
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun exportEmployee(
        @PathVariable employeeId: Long,
    ): ResponseEntity<InputStreamResource> {
        val result = employeeExportService.exportEmployeeById(employeeId)
            ?: throw NotFoundException("Mitarbeiter (ID: $employeeId) nicht gefunden!")

        val headers = HttpHeaders()
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=${result.filename}")

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.APPLICATION_PDF)
            .body(InputStreamResource(ByteArrayInputStream(result.bytes)))
    }
}
