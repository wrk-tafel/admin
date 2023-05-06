package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
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

    @Test
    fun `create new note - empty text`() {
        val customerId = 123L

        val exception = assertThrows<TafelValidationException> {
            controller.createNewNote(
                customerId = customerId,
                request = CreateCustomerNoteRequest(note = "")
            )
        }

        assertThat(exception.message).isEqualTo("Notiz darf nicht leer sein!")
    }

    @Test
    fun `create new note - successful`() {
        val customerId = 123L
        val note = "test note"

        val noteItem = CustomerNoteItem(
            author = "author 2",
            timestamp = ZonedDateTime.now().minusDays(1),
            note = "note 2"
        )
        every { service.createNewNote(customerId, note) } returns noteItem

        val response = controller.createNewNote(
            customerId = customerId,
            request = CreateCustomerNoteRequest(note = note)
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(noteItem)
        verify { service.createNewNote(customerId, note) }
    }

}
