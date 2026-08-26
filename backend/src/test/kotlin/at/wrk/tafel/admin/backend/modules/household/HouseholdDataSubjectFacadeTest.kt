package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdExportFileResult
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdExportService
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class HouseholdDataSubjectFacadeTest {

    @RelaxedMockK
    private lateinit var householdService: HouseholdService

    @RelaxedMockK
    private lateinit var householdExportService: HouseholdExportService

    @InjectMockKs
    private lateinit var facade: HouseholdDataSubjectFacade

    @Test
    fun `export maps the household export result`() {
        every { householdExportService.exportHousehold(1234) } returns HouseholdExportFileResult(
            filename = "datenexport-1234.zip",
            bytes = "zip-bytes".toByteArray(),
        )

        val result = facade.export(1234)

        assertThat(result).isEqualTo(ExportFileResult(filename = "datenexport-1234.zip", bytes = "zip-bytes".toByteArray()))
    }

    @Test
    fun `export returns null for an unknown household`() {
        every { householdExportService.exportHousehold(999) } returns null

        assertThat(facade.export(999)).isNull()
    }

    @Test
    fun `delete returns false for an unknown household`() {
        every { householdService.existsByHouseholdId(999) } returns false

        val result = facade.delete(999)

        assertThat(result).isFalse
        verify(exactly = 0) { householdService.deleteHouseholdByHouseholdId(any()) }
    }

    @Test
    fun `delete removes an existing household`() {
        every { householdService.existsByHouseholdId(1234) } returns true

        val result = facade.delete(1234)

        assertThat(result).isTrue
        verify { householdService.deleteHouseholdByHouseholdId(1234) }
    }
}
