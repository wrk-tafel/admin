package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.database.entities.checkin.TicketNumberEntity
import at.wrk.tafel.admin.backend.database.repositories.checkin.TicketNumberRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.util.stream.IntStream

@ExtendWith(MockKExtension::class)
internal class TicketServiceTest {

    @RelaxedMockK
    private lateinit var repository: TicketNumberRepository

    @InjectMockKs
    private lateinit var service: TicketService

    private val testTicketNumbers = IntStream.range(1, 101).mapToObj {
        TicketNumberEntity().apply {
            id = it.toLong()
            number = it
        }
    }.toList()

    @BeforeEach
    fun beforeEach() {
        every { repository.findAll() } returns testTicketNumbers
        service.init()
    }

    @Test
    fun `get first ticket`() {
        val result = service.getNextTicket()

        assertThat(result).isOne
    }

    @Test
    fun `get ticket number 3`() {
        service.getNextTicket()
        service.getNextTicket()
        val result = service.getNextTicket()

        assertThat(result).isEqualTo(3)
    }

}
