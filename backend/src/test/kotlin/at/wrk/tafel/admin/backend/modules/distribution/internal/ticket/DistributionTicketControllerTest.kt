package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.TicketNumberResponse
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity3
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
    fun `get current ticket for customer 1`() {
        val customerId = 123L
        every { service.getCurrentTicketNumber(customerId) } returns testDistributionCustomerEntity1

        val response = controller.getCurrentTicketForCustomerId(customerId)

        assertThat(response).isEqualTo(
            TicketNumberResponse(ticketNumber = 50),
        )
    }

    @Test
    fun `get current ticket for customer 2`() {
        val customerId = 123L
        every { service.getCurrentTicketNumber(customerId) } returns testDistributionCustomerEntity3

        val response = controller.getCurrentTicketForCustomerId(customerId)

        assertThat(response).isEqualTo(
            TicketNumberResponse(ticketNumber = 52),
        )
    }

    @Test
    fun `delete current ticket for customer`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.deleteCurrentTicket(any()) } returns true

        val customerId = 123L
        val response = controller.deleteCurrentTicketForCustomer(customerId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify { service.deleteCurrentTicket(customerId) }
    }

    @Test
    fun `delete current ticket for customer failed`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.deleteCurrentTicket(any()) } returns false

        val customerId = 123L

        val exception = assertThrows<TafelValidationException> { controller.deleteCurrentTicketForCustomer(customerId) }
        assertThat(exception.message).isEqualTo("Löschen des Tickets von Kunde Nr. 123 fehlgeschlagen!")

        verify { service.deleteCurrentTicket(customerId) }
    }

}
