package at.wrk.tafel.admin.backend.modules.datasubjectrequest

import at.wrk.tafel.admin.backend.common.export.ExportFileResult
import at.wrk.tafel.admin.backend.modules.datasubjectrequest.internal.DataSubjectRequestService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
class DataSubjectRequestControllerTest {

    @RelaxedMockK
    private lateinit var dataSubjectRequestService: DataSubjectRequestService

    @InjectMockKs
    private lateinit var controller: DataSubjectRequestController

    @Test
    fun `search`() {
        val response = DataSubjectMatchListResponse(
            items = listOf(DataSubjectMatchItem(type = DataSubjectMatchType.CUSTOMER, id = 1, businessKey = "1", name = "Max Mustermann")),
        )
        every { dataSubjectRequestService.search("Muster") } returns response

        val result = controller.search("Muster")

        assertThat(result).isEqualTo(response)
    }

    @Test
    fun `export`() {
        val matches = listOf(DataSubjectMatch(type = DataSubjectMatchType.CUSTOMER, id = 1))
        val testFilename = "datenauskunft.zip"
        every { dataSubjectRequestService.export(matches) } returns ExportFileResult(filename = testFilename, bytes = testFilename.toByteArray())

        val response = controller.export(DataSubjectExportRequest(matches = matches))

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.getFirst(HttpHeaders.CONTENT_TYPE)).isEqualTo("application/zip")
        assertThat(response.headers.getFirst(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo("inline; filename=$testFilename")
        assertThat(String(response.body!!.inputStream.readAllBytes())).isEqualTo(testFilename)
        verify { dataSubjectRequestService.export(matches) }
    }

    @Test
    fun `delete`() {
        val matches = listOf(DataSubjectMatch(type = DataSubjectMatchType.EMPLOYEE_WITHOUT_ACCOUNT, id = 3))
        val response = DataSubjectDeleteResponse(
            results = listOf(DataSubjectDeleteResultItem(match = matches.single(), outcome = DataSubjectDeleteOutcome.DELETED)),
        )
        every { dataSubjectRequestService.delete(matches) } returns response

        val result = controller.delete(DataSubjectDeleteRequest(matches = matches))

        assertThat(result).isEqualTo(response)
        verify { dataSubjectRequestService.delete(matches) }
    }
}
