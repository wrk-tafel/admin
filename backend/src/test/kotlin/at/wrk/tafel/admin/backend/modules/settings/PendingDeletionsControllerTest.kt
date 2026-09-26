package at.wrk.tafel.admin.backend.modules.settings

import at.wrk.tafel.admin.backend.modules.settings.internal.PendingDeletionsService
import at.wrk.tafel.admin.backend.modules.settings.model.PendingEmployeeDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingHouseholdDeletionListResponse
import at.wrk.tafel.admin.backend.modules.settings.model.PendingUserDeletionListResponse
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
    fun `returns the requested page of pending user deletions`() {
        val expected = PendingUserDeletionListResponse(true, "1 Jahr", "30 Tagen", 0, 2, 0, 25, emptyList())
        every { pendingDeletionsService.getPendingUserDeletions(2, 25) } returns expected

        assertThat(controller.getPendingUserDeletions(2, 25)).isEqualTo(expected)
    }

    @Test
    fun `returns the requested page of pending household deletions`() {
        val expected = PendingHouseholdDeletionListResponse(true, "7 Jahren", "30 Tagen", 0, 1, 0, 10, emptyList())
        every { pendingDeletionsService.getPendingHouseholdDeletions(null, null) } returns expected

        assertThat(controller.getPendingHouseholdDeletions(null, null)).isEqualTo(expected)
    }

    @Test
    fun `returns the requested page of pending employee deletions`() {
        val expected = PendingEmployeeDeletionListResponse(true, "1 Jahr", "30 Tagen", 0, 1, 0, 10, emptyList())
        every { pendingDeletionsService.getPendingEmployeeDeletions(3, 50) } returns expected

        assertThat(controller.getPendingEmployeeDeletions(3, 50)).isEqualTo(expected)
    }
}
