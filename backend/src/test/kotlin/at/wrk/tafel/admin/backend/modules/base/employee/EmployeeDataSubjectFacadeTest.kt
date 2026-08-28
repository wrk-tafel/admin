package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeExportFileResult
import at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeExportService
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
internal class EmployeeDataSubjectFacadeTest {

    @RelaxedMockK
    private lateinit var employeeService: EmployeeService

    @RelaxedMockK
    private lateinit var employeeExportService: EmployeeExportService

    @InjectMockKs
    private lateinit var facade: EmployeeDataSubjectFacade

    @Test
    fun `export maps the employee export result`() {
        every { employeeExportService.exportEmployeeById(5) } returns EmployeeExportFileResult(
            filename = "mitarbeiterdaten-00002.zip",
            bytes = "zip-bytes".toByteArray(),
        )

        val result = facade.export(5)

        assertThat(result).isEqualTo(ExportFileResult(filename = "mitarbeiterdaten-00002.zip", bytes = "zip-bytes".toByteArray()))
    }

    @Test
    fun `export returns null for an unknown employee`() {
        every { employeeExportService.exportEmployeeById(999) } returns null

        assertThat(facade.export(999)).isNull()
    }

    @Test
    fun `delete delegates to the employee service`() {
        facade.delete(5)

        verify { employeeService.deleteEmployee(5) }
    }
}
