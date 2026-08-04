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
                EmployeeResponse(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
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
}
