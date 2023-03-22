package at.wrk.tafel.admin.backend.modules.customer.note

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
internal class CustomerNoteControllerTest {

    @RelaxedMockK
    private lateinit var service: CustomerNoteService

    @InjectMockKs
    private lateinit var controller: CustomerNoteController

    @Test
    fun `get notes - empty`() {
        val customerId = 123L
        every { service.getNotes(customerId) } returns emptyList()

        val response = controller.getNotes(customerId)

        assertThat(response.notes).isEmpty()
    }

    @Test
    fun `get notes - found`() {
        val customerId = 123L
        val notes = listOf(
            CustomerNoteItem(
                author = "author 2",
                timestamp = ZonedDateTime.now().minusDays(1),
                note = "note 2"
            ),
            CustomerNoteItem(
                author = "author 1",
                timestamp = ZonedDateTime.now().minusDays(2),
                note = "note 1"
            )
        )
        every { service.getNotes(customerId) } returns notes

        val response = controller.getNotes(customerId)

        assertThat(response.notes).hasSize(notes.size)
        assertThat(response.notes).isEqualTo(notes)
        verify { service.getNotes(customerId) }
    }

}
