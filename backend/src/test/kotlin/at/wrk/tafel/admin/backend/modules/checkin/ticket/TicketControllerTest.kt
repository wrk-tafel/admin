package at.wrk.tafel.admin.backend.modules.checkin.ticket

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.persistence.EntityNotFoundException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class TicketControllerTest {

    @RelaxedMockK
    private lateinit var service: TicketService

    @InjectMockKs
    private lateinit var controller: TicketController

    @Test
    fun `getNextTicket successful`() {
        val ticketNumber = 100
        every { service.getNextTicket() } returns ticketNumber

        val response = controller.getNextTicket()

        assertThat(response.ticketNumber).isEqualTo(ticketNumber)
    }

    @Test
    fun `getNextTicket failed cause no ticket is left`() {
        every { service.getNextTicket() } returns null

        assertThrows(EntityNotFoundException::class.java) {
            controller.getNextTicket()
        }
    }

}
