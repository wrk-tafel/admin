package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
internal class DistributionTicketControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @InjectMockKs
    private lateinit var controller: DistributionTicketController

    @Test
    fun `get current ticket for household 1`() {
        val householdId = 123L
        every { service.getCurrentTicketNumber(householdId) } returns testDistributionHouseholdEntity1

        val response = controller.getCurrentTicketForHouseholdId(householdId)

        assertThat(response).isEqualTo(
            TicketNumberResponse(ticketNumber = 50),
        )
    }

    @Test
    fun `get current ticket for household 2`() {
        val householdId = 123L
        every { service.getCurrentTicketNumber(householdId) } returns testDistributionHouseholdEntity3

        val response = controller.getCurrentTicketForHouseholdId(householdId)

        assertThat(response).isEqualTo(
            TicketNumberResponse(ticketNumber = 52),
        )
    }

    @Test
    fun `delete current ticket for household`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.deleteCurrentTicket(any()) } returns true

        val householdId = 123L
        val response = controller.deleteCurrentTicketForHousehold(householdId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify { service.deleteCurrentTicket(householdId) }
    }

    @Test
    fun `delete current ticket for household failed`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.deleteCurrentTicket(any()) } returns false

        val householdId = 123L

        val exception = assertThrows<TafelValidationException> { controller.deleteCurrentTicketForHousehold(householdId) }
        assertThat(exception.message).isEqualTo("Löschen des Tickets von Kunde Nr. 123 fehlgeschlagen!")

        verify { service.deleteCurrentTicket(householdId) }
    }
}
