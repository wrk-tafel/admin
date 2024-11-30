package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
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
    fun `get current ticketNumber with open distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val ticketNumber = 123
        every { service.getCurrentTicketNumber() } returns ticketNumber

        val response = controller.getCurrentTicket()

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `get current ticketNumber for customer`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val ticketNumber = 123
        val customerId = 1L
        every { service.getCurrentTicketNumber(customerId) } returns ticketNumber

        val response = controller.getCurrentTicketForCustomerId(customerId)

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `get current ticketNumber when ticket is null`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        every { service.getCurrentTicketNumber() } returns null

        val response = controller.getCurrentTicket()

        assertThat(response.ticketNumber).isNull()
    }

    @Test
    fun `get next ticket with open distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        val ticketNumber = 123
        every { service.closeCurrentTicketAndGetNext() } returns ticketNumber

        val response = controller.getNextTicket()

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `get next ticket when ticket is null`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity

        every { service.closeCurrentTicketAndGetNext() } returns null

        val response = controller.getNextTicket()

        assertThat(response.ticketNumber).isNull()
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
