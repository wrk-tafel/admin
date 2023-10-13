package at.wrk.tafel.admin.backend.modules.customer.internal.note

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
import java.time.LocalDateTime


@ExtendWith(MockKExtension::class)
internal class CustomerNoteControllerTest {

    @RelaxedMockK
    private lateinit var service: CustomerNoteService

    @InjectMockKs
    private lateinit var controller: CustomerNoteController

    @Test
    fun `get notes - empty`() {
        val customerId = 123L
        val testSearchResult = CustomerNoteSearchResult(
            items = emptyList(),
            totalCount = 0,
            currentPage = 1,
            totalPages = 1,
            pageSize = 10
        )
        every { service.getNotes(customerId, any()) } returns testSearchResult

        val response = controller.getNotes(customerId, null)

        assertThat(response.notes).isEmpty()
    }

    @Test
    fun `get notes - found`() {
        val customerId = 123L
        val selectedPage = 3
        val notes = listOf(
            CustomerNoteItem(
                author = "author 2",
                timestamp = LocalDateTime.now().minusDays(1),
                note = "note 2"
            ),
            CustomerNoteItem(
                author = "author 1",
                timestamp = LocalDateTime.now().minusDays(2),
                note = "note 1"
            )
        )

        val testSearchResult = CustomerNoteSearchResult(
            items = notes,
            totalCount = 2,
            currentPage = selectedPage,
            totalPages = 3,
            pageSize = 10
        )
        every { service.getNotes(customerId, any()) } returns testSearchResult

        val response = controller.getNotes(customerId, selectedPage)

        assertThat(response.notes).hasSize(notes.size)
        assertThat(response.notes).isEqualTo(notes)
        assertThat(response.currentPage).isEqualTo(1)
        assertThat(response.pageSize).isEqualTo(1)
        assertThat(response.totalCount).isEqualTo(1)
        assertThat(response.totalPages).isEqualTo(1)


        verify { service.getNotes(customerId, selectedPage) }
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
            timestamp = LocalDateTime.now().minusDays(1),
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
