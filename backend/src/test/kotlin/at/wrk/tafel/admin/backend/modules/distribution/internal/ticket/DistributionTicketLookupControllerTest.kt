package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketHouseholdResponse
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class DistributionTicketLookupControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @InjectMockKs
    private lateinit var controller: DistributionTicketLookupController

    @Test
    fun `household for ticket number`() {
        every { service.getHouseholdIdForTicketNumber(12) } returns 345L

        val response = controller.getHouseholdForTicketNumber(12)

        assertThat(response).isEqualTo(TicketHouseholdResponse(ticketNumber = 12, householdId = 345L))
    }
}
