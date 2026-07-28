package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.modules.reporting.internal.SchoolStarterPackageReportCsvResult
import at.wrk.tafel.admin.backend.modules.reporting.internal.SchoolStarterPackageReportService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType

@ExtendWith(MockKExtension::class)
class SchoolStarterPackageReportControllerTest {

    @RelaxedMockK
    private lateinit var service: SchoolStarterPackageReportService

    @InjectMockKs
    private lateinit var controller: SchoolStarterPackageReportController

    @Test
    fun `generate csv - result mapped`() {
        val testFilename = "schulstartpakete_28.07.2026.csv"
        every { service.generateCsv() } returns SchoolStarterPackageReportCsvResult(
            filename = testFilename,
            bytes = testFilename.toByteArray(),
        )

        val response = controller.generateCsv()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo(MediaType.TEXT_PLAIN_VALUE)
        assertThat(
            response.headers.get(HttpHeaders.CONTENT_DISPOSITION)!!.first(),
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }
}
