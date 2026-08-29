package at.wrk.tafel.admin.backend.modules.support

import at.wrk.tafel.admin.backend.modules.support.internal.ClientErrorLogService
import at.wrk.tafel.admin.backend.modules.support.model.ClientErrorReportRequest
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class ClientErrorControllerTest {

    @RelaxedMockK
    private lateinit var clientErrorLogService: ClientErrorLogService

    @InjectMockKs
    private lateinit var clientErrorController: ClientErrorController

    @Test
    fun `report client error`() {
        val request = ClientErrorReportRequest(
            message = "TypeError: x is not a function",
            page = "http://localhost/uebersicht",
            userAgent = "Mozilla/5.0",
        )

        clientErrorController.reportClientError(request)

        verify(exactly = 1) { clientErrorLogService.record(request) }
    }
}
