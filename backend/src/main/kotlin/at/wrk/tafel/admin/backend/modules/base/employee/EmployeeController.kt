package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import jakarta.websocket.server.PathParam
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/employees")
class EmployeeController(
    private val employeeRepository: EmployeeRepository
) {

    @GetMapping
    fun getEmployees(@PathParam("personnelNumber") personnelNumber: String? = null): EmployeeListResponse {
        val employees =
            if (personnelNumber != null) listOfNotNull(employeeRepository.findByPersonnelNumber(personnelNumber))
            else employeeRepository.findAll()

        return EmployeeListResponse(items = employees.map { mapEntityToEmployee(it) })
    }

    @PostMapping
    @Transactional
    fun saveEmployee(@RequestBody employeeCreateRequest: EmployeeCreateRequest): Employee {
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
        lastname = it.lastname!!
    )

}
