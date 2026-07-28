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
                Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
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
        val employeeCreateRequest = EmployeeCreateRequest(
            personnelNumber = "00001",
            firstname = "first 1",
            lastname = "last 1",
        )
        val savedEmployee = Employee(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1")
        every { employeeService.saveEmployee(employeeCreateRequest) } returns savedEmployee

        val result = employeeController.saveEmployee(employeeCreateRequest)

        assertThat(result).isEqualTo(savedEmployee)
        verify { employeeService.saveEmployee(employeeCreateRequest) }
    }
}
