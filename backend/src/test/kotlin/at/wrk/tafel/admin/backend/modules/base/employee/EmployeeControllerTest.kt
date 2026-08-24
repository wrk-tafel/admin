package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
class EmployeeControllerTest {

    @RelaxedMockK
    private lateinit var employeeService: EmployeeService

    @InjectMockKs
    private lateinit var employeeController: EmployeeController

    @Test
    fun `find employees`() {
        val response = EmployeeListResponse(
            items = listOf(
                EmployeeItem(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
            ),
            totalCount = 1,
            currentPage = 1,
            totalPages = 1,
            pageSize = 5,
        )
        every { employeeService.findEmployees("test-input", 1) } returns response

        val result = employeeController.findEmployees(searchInput = "test-input", page = 1)

        assertThat(result).isEqualTo(response)
    }

    @Test
    fun `check personnel number availability`() {
        val response = PersonnelNumberAvailabilityResponse(
            available = false,
            existingEmployee = EmployeeResponse(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
        )
        every { employeeService.checkPersonnelNumberAvailability("00001", 2) } returns response

        val result = employeeController.checkPersonnelNumberAvailability(personnelNumber = "00001", excludedEmployeeId = 2)

        assertThat(result).isEqualTo(response)
    }

    @Test
    fun `save employee`() {
        val employeeCreateRequest = EmployeeRequest(
            personnelNumber = "00001",
            firstname = "first 1",
            lastname = "last 1",
        )
        val savedEmployee = EmployeeResponse(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1")
        every { employeeService.saveEmployee(employeeCreateRequest) } returns savedEmployee

        val result = employeeController.saveEmployee(employeeCreateRequest)

        assertThat(result.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(result.body).isEqualTo(savedEmployee)
        verify { employeeService.saveEmployee(employeeCreateRequest) }
    }

    @Test
    fun `update employee`() {
        val employeeId = 1L
        val employeeUpdateRequest = EmployeeRequest(
            personnelNumber = "00001",
            firstname = "first 1",
            lastname = "last 1",
        )
        val updatedEmployee = EmployeeResponse(id = employeeId, personnelNumber = "00001", firstname = "first 1", lastname = "last 1")
        every { employeeService.updateEmployee(employeeId, employeeUpdateRequest) } returns updatedEmployee

        val result = employeeController.updateEmployee(employeeId, employeeUpdateRequest)

        assertThat(result).isEqualTo(updatedEmployee)
        verify { employeeService.updateEmployee(employeeId, employeeUpdateRequest) }
    }

    @Test
    fun `delete employee`() {
        every { employeeService.deleteEmployee(1L) } returns Unit

        val response = employeeController.deleteEmployee(1L)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { employeeService.deleteEmployee(1L) }
    }
}
