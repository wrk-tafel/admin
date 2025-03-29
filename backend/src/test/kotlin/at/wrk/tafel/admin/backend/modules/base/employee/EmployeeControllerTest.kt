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
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest

@ExtendWith(MockKExtension::class)
class EmployeeControllerTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @InjectMockKs
    private lateinit var employeeController: EmployeeController

    @Test
    fun `find employees with searchInput and page`() {
        val pageRequest = PageRequest.of(0, 5)
        val searchInput = "test-input"

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

        val pagedResult = PageImpl(listOf(employee1, employee2), pageRequest, 123)
        every { employeeRepository.findBySearchInput(searchInput, pageRequest) } returns pagedResult

        val response = employeeController.findEmployees(searchInput = searchInput, page = 1)

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
    fun `find employees without searchInput and page`() {
        val employee1 = EmployeeEntity()
        employee1.id = 1
        employee1.personnelNumber = "00001"
        employee1.firstname = "first 1"
        employee1.lastname = "last 1"

        val pageRequest = PageRequest.of(0, 5)
        val pagedResult = PageImpl(listOf(employee1), pageRequest, 123)
        every { employeeRepository.findAll(pageRequest) } returns pagedResult

        val response = employeeController.findEmployees()

        assertThat(response).isNotNull
        assertThat(response.items).hasSize(1)

        assertThat(response.items).hasSameElementsAs(
            listOf(
                Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1")
            )
        )
    }

    @Test
    fun `find employee by searchInput not found`() {
        every { employeeRepository.findBySearchInput(any(), any()) } returns Page.empty()

        val response = employeeController.findEmployees(searchInput = "0000X")

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
