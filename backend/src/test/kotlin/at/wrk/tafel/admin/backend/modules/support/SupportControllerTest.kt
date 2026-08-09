package at.wrk.tafel.admin.backend.modules.support

import at.wrk.tafel.admin.backend.modules.support.internal.SupportService
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class SupportControllerTest {

    @RelaxedMockK
    private lateinit var supportService: SupportService

    @InjectMockKs
    private lateinit var supportController: SupportController

    @Test
    fun `create support request`() {
        val request = SupportRequest(
            title = "Bug in login",
            text = "Something is broken",
            clientContext = SupportClientContext(page = "http://localhost/login"),
        )

        supportController.createSupportRequest(request)

        verify(exactly = 1) { supportService.sendSupportRequest(request) }
    }
}
