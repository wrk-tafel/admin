package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
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

@RestController
@RequestMapping("/api/employees")
@PreAuthorize("hasAuthority('LOGISTICS') or hasAuthority('SETTINGS')")
class EmployeeController(
    private val employeeService: EmployeeService,
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
}
