package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.sanitizeForLog
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
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EmployeeService(
    private val employeeRepository: EmployeeRepository,
    private val userRepository: UserRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(EmployeeService::class.java)
    }

    fun findEmployees(
        searchInput: String? = null,
        page: Int? = null,
        pageSize: Int? = null,
        sortBy: String? = null,
        sortDirection: String? = null,
    ): EmployeeListResponse {
        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))
        val spec = EmployeeEntity.Specs.orderById(
            Specification.allOf(listOfNotNull(EmployeeEntity.Specs.searchInputMatches(searchInput))),
            sortBy,
            sortDirection,
        )
        val pagedResult = employeeRepository.findAll(spec, pageRequest)

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
        val personnelNumber = employeeRequest.personnelNumber.trim()
        if (employeeRepository.existsByPersonnelNumber(personnelNumber)) {
            throw ConflictException("Mitarbeiter $personnelNumber ist bereits vorhanden!")
        }

        val employeeEntity = EmployeeEntity(
            personnelNumber = personnelNumber,
            firstname = employeeRequest.firstname.trim(),
            lastname = employeeRequest.lastname.trim(),
        )
        employeeRepository.save(employeeEntity)
        return mapEntityToEmployee(employeeRepository.findByPersonnelNumber(personnelNumber)!!)
    }

    @Transactional
    fun updateEmployee(employeeId: Long, employeeRequest: EmployeeRequest): EmployeeResponse {
        val employeeEntity = employeeRepository.findByIdOrNull(employeeId)
            ?: throw NotFoundException("Employee with id $employeeId not found")

        val personnelNumber = employeeRequest.personnelNumber.trim()
        if (employeeRepository.existsByPersonnelNumberAndIdNot(personnelNumber, employeeId)) {
            throw ConflictException("Mitarbeiter $personnelNumber ist bereits vorhanden!")
        }

        employeeEntity.personnelNumber = personnelNumber
        employeeEntity.firstname = employeeRequest.firstname.trim()
        employeeEntity.lastname = employeeRequest.lastname.trim()

        val savedEntity = employeeRepository.save(employeeEntity)
        return mapEntityToEmployee(savedEntity)
    }

    /**
     * Employees are personal data and stay deletable even once referenced elsewhere - as the issuer
     * of a household, the author of a household note, or the driver/co-driver of a food collection.
     * Those FKs are `on delete set null` (see `R__00106_employee_delete_set_null.sql`), so the delete
     * always succeeds and the reference is simply cleared; the reader shows "Mitarbeiter gelöscht"
     * wherever such a now-empty reference is displayed (`HouseholdNoteService.mapNote`, the frontend's
     * `formatIssuer` pipe).
     *
     * The one thing that still blocks a delete is a linked user account: unlike those references,
     * `users.employee_id` is the account's *identity* - personnel number/first/last name have no
     * separate storage on `users` at all - so nulling it out would leave a working login with no name
     * anywhere (search, audit log, PDFs). Delete or unlink the user account first.
     */
    @Transactional
    fun deleteEmployee(employeeId: Long) {
        val employeeEntity = employeeRepository.findByIdOrNull(employeeId)
            ?: throw NotFoundException("Mitarbeiter (ID: $employeeId) nicht vorhanden!")

        if (userRepository.existsByEmployeeId(employeeId)) {
            throw ConflictException("Mitarbeiter hat ein Benutzerkonto und kann nicht gelöscht werden!")
        }

        employeeRepository.delete(employeeEntity)
        // DEBUG, not INFO: EmployeeRetentionService already logs an aggregate count for its
        // nightly run, so an INFO line with the personnel number here would only repeat that for
        // every employee it deletes.
        log.debug("Deleted employee {} ({})", employeeId, sanitizeForLog(employeeEntity.personnelNumber))
    }

    private fun mapEntityToEmployee(it: EmployeeEntity) = EmployeeResponse(
        id = it.id!!,
        personnelNumber = it.personnelNumber,
        firstname = it.firstname,
        lastname = it.lastname,
    )
}
