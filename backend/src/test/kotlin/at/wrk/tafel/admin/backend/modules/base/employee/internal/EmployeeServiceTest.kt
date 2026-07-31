package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeCreateRequest
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeListResponse
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class EmployeeServiceTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @InjectMockKs
    private lateinit var employeeService: EmployeeService

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

        val response = employeeService.findEmployees(searchInput = searchInput, page = 1)

        assertThat(response).isEqualTo(
            EmployeeListResponse(
                items = listOf(
                    Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
                    Employee(id = 2, personnelNumber = "00002", firstname = "first 2", lastname = "last 2"),
                ),
                totalCount = 123,
                currentPage = 1,
                totalPages = pagedResult.totalPages,
                pageSize = pageRequest.pageSize,
            ),
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

        val response = employeeService.findEmployees()

        assertThat(response.items).isEqualTo(
            listOf(
                Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
            ),
        )
    }

    @Test
    fun `find employee by searchInput not found`() {
        every { employeeRepository.findBySearchInput(any(), any()) } returns Page.empty()

        val response = employeeService.findEmployees(searchInput = "0000X")

        assertThat(response.items).isEmpty()
    }

    @Test
    fun `save employee`() {
        val employeeCreateRequest = EmployeeCreateRequest(
            personnelNumber = "   00001",
            firstname = "first 1  ",
            lastname = "last 1    ",
        )
        val entity = EmployeeEntity().apply {
            id = 1
            personnelNumber = "00001"
            firstname = "first 1"
            lastname = "last 1"
        }
        every { employeeRepository.save(any()) } returns entity
        every { employeeRepository.findByPersonnelNumber(employeeCreateRequest.personnelNumber) } returns entity

        employeeService.saveEmployee(employeeCreateRequest)

        val entitySlot = slot<EmployeeEntity>()
        verify { employeeRepository.save(capture(entitySlot)) }

        val savedEntity = entitySlot.captured
        assertThat(savedEntity.personnelNumber).isEqualTo(employeeCreateRequest.personnelNumber.trim())
        assertThat(savedEntity.firstname).isEqualTo(employeeCreateRequest.firstname.trim())
        assertThat(savedEntity.lastname).isEqualTo(employeeCreateRequest.lastname.trim())
    }

    @Test
    fun `update employee`() {
        val employeeId = 1L
        val existingEntity = EmployeeEntity().apply {
            id = employeeId
            personnelNumber = "00001"
            firstname = "Old firstname"
            lastname = "Old lastname"
        }
        val employeeUpdateRequest = EmployeeCreateRequest(
            personnelNumber = "  00002",
            firstname = "New firstname  ",
            lastname = "New lastname   ",
        )
        every { employeeRepository.findByIdOrNull(employeeId) } returns existingEntity
        every { employeeRepository.existsByPersonnelNumberAndIdNot(any(), any()) } returns false
        every { employeeRepository.save(any()) } returns existingEntity

        val result = employeeService.updateEmployee(employeeId, employeeUpdateRequest)

        assertThat(result).isEqualTo(
            Employee(
                id = employeeId,
                personnelNumber = "00002",
                firstname = "New firstname",
                lastname = "New lastname",
            ),
        )

        val entitySlot = slot<EmployeeEntity>()
        verify { employeeRepository.save(capture(entitySlot)) }

        val savedEntity = entitySlot.captured
        assertThat(savedEntity.personnelNumber).isEqualTo("00002")
        assertThat(savedEntity.firstname).isEqualTo("New firstname")
        assertThat(savedEntity.lastname).isEqualTo("New lastname")
    }

    @Test
    fun `update employee throws exception when not found`() {
        every { employeeRepository.findByIdOrNull(99L) } returns null

        assertThatThrownBy {
            employeeService.updateEmployee(
                99L,
                EmployeeCreateRequest(personnelNumber = "00001", firstname = "first", lastname = "last"),
            )
        }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("Employee with id 99 not found")
    }

    @Test
    fun `update employee throws exception when personnelNumber already used by another employee`() {
        val employeeId = 1L
        val existingEntity = EmployeeEntity().apply {
            id = employeeId
            personnelNumber = "00001"
            firstname = "first"
            lastname = "last"
        }
        every { employeeRepository.findByIdOrNull(employeeId) } returns existingEntity
        every { employeeRepository.existsByPersonnelNumberAndIdNot("00002", employeeId) } returns true

        assertThatThrownBy {
            employeeService.updateEmployee(
                employeeId,
                EmployeeCreateRequest(personnelNumber = "00002", firstname = "first", lastname = "last"),
            )
        }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("Mitarbeiter 00002 ist bereits vorhanden!")
    }
}
