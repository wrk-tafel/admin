package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeCreateRequest
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeListResponse
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EmployeeService(
    private val employeeRepository: EmployeeRepository,
) {

    fun findEmployees(searchInput: String? = null, page: Int? = null): EmployeeListResponse {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 5)
        val pagedResult = if (searchInput != null) {
            employeeRepository.findBySearchInput(searchInput, pageRequest)
        } else {
            employeeRepository.findAll(pageRequest)
        }

        return EmployeeListResponse(
            items = pagedResult.map { mapEntityToEmployee(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    @Transactional
    fun saveEmployee(employeeCreateRequest: EmployeeCreateRequest): Employee {
        if (employeeRepository.existsByPersonnelNumber(employeeCreateRequest.personnelNumber)) {
            throw TafelValidationException("Mitarbeiter ${employeeCreateRequest.personnelNumber} ist bereits vorhanden!")
        }

        val employeeEntity = EmployeeEntity().apply {
            personnelNumber = employeeCreateRequest.personnelNumber.trim()
            firstname = employeeCreateRequest.firstname.trim()
            lastname = employeeCreateRequest.lastname.trim()
        }
        employeeRepository.save(employeeEntity)
        return mapEntityToEmployee(employeeRepository.findByPersonnelNumber(employeeCreateRequest.personnelNumber)!!)
    }

    private fun mapEntityToEmployee(it: EmployeeEntity) = Employee(
        id = it.id!!,
        personnelNumber = it.personnelNumber!!,
        firstname = it.firstname!!,
        lastname = it.lastname!!,
    )
}
