package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/employees")
@PreAuthorize("hasAuthority('LOGISTICS')")
class EmployeeController(
    private val employeeService: EmployeeService,
) {

    @GetMapping
    fun findEmployees(
        @RequestParam searchInput: String? = null,
        @RequestParam page: Int? = null,
    ): EmployeeListResponse = employeeService.findEmployees(searchInput, page)

    @PostMapping
    fun saveEmployee(@RequestBody employeeCreateRequest: EmployeeCreateRequest): Employee = employeeService.saveEmployee(employeeCreateRequest)
}
