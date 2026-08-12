package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeItem
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeListResponse
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeRequest
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeUserAccount
import at.wrk.tafel.admin.backend.modules.base.employee.PersonnelNumberAvailabilityResponse
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EmployeeService(
    private val employeeRepository: EmployeeRepository,
    private val userRepository: UserRepository,
) {

    fun findEmployees(searchInput: String? = null, page: Int? = null, pageSize: Int? = null): EmployeeListResponse {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize), Sort.by("id"))
        val pagedResult = if (searchInput != null) {
            employeeRepository.findBySearchInput(searchInput, pageRequest)
        } else {
            employeeRepository.findAll(pageRequest)
        }

        val employeeIds = pagedResult.content.mapNotNull { it.id }
        val accountsByEmployeeId = if (employeeIds.isEmpty()) {
            emptyMap()
        } else {
            userRepository.findAccountsByEmployeeIds(employeeIds).associateBy { it.employeeId }
        }

        return EmployeeListResponse(
            items = pagedResult.map { employee ->
                EmployeeItem(
                    id = employee.id!!,
                    personnelNumber = employee.personnelNumber,
                    firstname = employee.firstname,
                    lastname = employee.lastname,
                    userAccount = accountsByEmployeeId[employee.id]?.let { EmployeeUserAccount(id = it.userId, username = it.username) },
                )
            }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * Answers whether [personnelNumber] is still free before a save is attempted -
     * [excludedEmployeeId] being the employee currently edited, whose own number is not a collision
     * with itself. The save paths below re-check this: a number can be taken between the two calls,
     * and this one is only what the screen shows, never what decides.
     */
    fun checkPersonnelNumberAvailability(personnelNumber: String, excludedEmployeeId: Long? = null): PersonnelNumberAvailabilityResponse {
        val existingEmployee = employeeRepository.findByPersonnelNumber(personnelNumber.trim())
            ?.takeIf { it.id != excludedEmployeeId }

        return PersonnelNumberAvailabilityResponse(
            available = existingEmployee == null,
            existingEmployee = existingEmployee?.let { mapEntityToEmployee(it) },
        )
    }

    @Transactional
    fun saveEmployee(employeeRequest: EmployeeRequest): EmployeeResponse {
        if (employeeRepository.existsByPersonnelNumber(employeeRequest.personnelNumber)) {
            throw ConflictException("Mitarbeiter ${employeeRequest.personnelNumber} ist bereits vorhanden!")
        }

        val employeeEntity = EmployeeEntity(
            personnelNumber = employeeRequest.personnelNumber.trim(),
            firstname = employeeRequest.firstname.trim(),
            lastname = employeeRequest.lastname.trim(),
        )
        employeeRepository.save(employeeEntity)
        return mapEntityToEmployee(employeeRepository.findByPersonnelNumber(employeeRequest.personnelNumber)!!)
    }

    @Transactional
    fun updateEmployee(employeeId: Long, employeeRequest: EmployeeRequest): EmployeeResponse {
        val employeeEntity = employeeRepository.findByIdOrNull(employeeId)
            ?: throw NotFoundException("Employee with id $employeeId not found")

        if (employeeRepository.existsByPersonnelNumberAndIdNot(employeeRequest.personnelNumber, employeeId)) {
            throw ConflictException("Mitarbeiter ${employeeRequest.personnelNumber} ist bereits vorhanden!")
        }

        employeeEntity.personnelNumber = employeeRequest.personnelNumber.trim()
        employeeEntity.firstname = employeeRequest.firstname.trim()
        employeeEntity.lastname = employeeRequest.lastname.trim()

        val savedEntity = employeeRepository.save(employeeEntity)
        return mapEntityToEmployee(savedEntity)
    }

    private fun mapEntityToEmployee(it: EmployeeEntity) = EmployeeResponse(
        id = it.id!!,
        personnelNumber = it.personnelNumber,
        firstname = it.firstname,
        lastname = it.lastname,
    )
}
