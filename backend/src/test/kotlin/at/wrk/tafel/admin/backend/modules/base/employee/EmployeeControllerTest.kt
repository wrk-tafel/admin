package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class EmployeeControllerTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @InjectMockKs
    private lateinit var employeeController: EmployeeController

    @Test
    fun `get employees`() {
        val employee1 = EmployeeEntity()
        employee1.id = 1
        employee1.personnelNumber = "00001"
        employee1.firstname = "first 1"
        employee1.lastname = "last 1"

        val employee2 = EmployeeEntity()
        employee2.id = 2
        employee2.personnelNumber = "00002"
        employee2.firstname = "first 2"
        employee2.lastname = "last 2"

        every { employeeRepository.findAll() } returns listOf(employee1, employee2)

        val response = employeeController.getEmployees()

        assertThat(response).isNotNull
        assertThat(response.items).hasSize(2)

        assertThat(response.items).hasSameElementsAs(
            listOf(
                Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
                Employee(id = 2, personnelNumber = "00002", firstname = "first 2", lastname = "last 2"),
            )
        )
    }

    @Test
    fun `get employee by personnelNumber`() {
        val employee1 = EmployeeEntity()
        employee1.id = 1
        employee1.personnelNumber = "00001"
        employee1.firstname = "first 1"
        employee1.lastname = "last 1"

        every { employeeRepository.findByPersonnelNumber(employee1.personnelNumber!!) } returns employee1

        val response = employeeController.getEmployees(personnelNumber = employee1.personnelNumber)

        assertThat(response).isNotNull
        assertThat(response.items).hasSize(1)

        assertThat(response.items).hasSameElementsAs(
            listOf(
                Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
            )
        )
    }

    @Test
    fun `get employee by personnelNumber not found`() {
        every { employeeRepository.findByPersonnelNumber(any()) } returns null

        val response = employeeController.getEmployees(personnelNumber = "0000X")

        assertThat(response).isNotNull
        assertThat(response.items).isEmpty()
    }

    @Test
    fun `save employee`() {
        val employeeCreateRequest = EmployeeCreateRequest(
            personnelNumber = "   00001",
            firstname = "first 1  ",
            lastname = "last 1    "
        )
        val entity = EmployeeEntity().apply {
            id = 1
            personnelNumber = "00001"
            firstname = "first 1"
            lastname = "last 1"
        }
        every { employeeRepository.save(any()) } returns entity
        every { employeeRepository.findByPersonnelNumber(employeeCreateRequest.personnelNumber) } returns entity

        employeeController.saveEmployee(employeeCreateRequest)

        val entitySlot = slot<EmployeeEntity>()
        verify { employeeRepository.save(capture(entitySlot)) }

        val savedEntity = entitySlot.captured
        assertThat(savedEntity.personnelNumber).isEqualTo(employeeCreateRequest.personnelNumber.trim())
        assertThat(savedEntity.firstname).isEqualTo(employeeCreateRequest.firstname.trim())
        assertThat(savedEntity.lastname).isEqualTo(employeeCreateRequest.lastname.trim())
    }

}
