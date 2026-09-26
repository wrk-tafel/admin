package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.PendingDeletionsService
import at.wrk.tafel.admin.backend.modules.settings.model.PendingDeletionsResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class PendingDeletionsControllerTest {

    @RelaxedMockK
    private lateinit var pendingDeletionsService: PendingDeletionsService

    @InjectMockKs
    private lateinit var controller: PendingDeletionsController

    @Test
    fun `returns what the service reports`() {
        val expected = PendingDeletionsResponse(users = null, households = null, employees = null)
        every { pendingDeletionsService.getPendingDeletions() } returns expected

        assertThat(controller.getPendingDeletions()).isEqualTo(expected)
    }
}
