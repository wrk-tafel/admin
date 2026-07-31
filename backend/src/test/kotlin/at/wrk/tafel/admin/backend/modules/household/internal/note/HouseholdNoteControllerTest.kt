package at.wrk.tafel.admin.backend.modules.household.internal.note

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class HouseholdNoteControllerTest {

    @RelaxedMockK
    private lateinit var service: HouseholdNoteService

    @InjectMockKs
    private lateinit var controller: HouseholdNoteController

    @Test
    fun `get notes - empty`() {
        val householdId = 123L
        val testSearchResult = HouseholdNoteSearchResult(
            items = emptyList(),
            totalCount = 0,
            currentPage = 1,
            totalPages = 1,
            pageSize = 10,
        )
        every { service.getNotes(householdId, any()) } returns testSearchResult

        val response = controller.getNotes(householdId, null)

        assertThat(response.items).isEmpty()
    }

    @Test
    fun `get notes - found`() {
        val householdId = 123L
        val selectedPage = 3
        val notes = listOf(
            HouseholdNoteItem(
                author = "author 2",
                timestamp = LocalDateTime.now().minusDays(1),
                note = "note 2",
            ),
            HouseholdNoteItem(
                author = "author 1",
                timestamp = LocalDateTime.now().minusDays(2),
                note = "note 1",
            ),
        )

        val testSearchResult = HouseholdNoteSearchResult(
            items = notes,
            totalCount = 2,
            currentPage = selectedPage,
            totalPages = 1,
            pageSize = 5,
        )
        every { service.getNotes(householdId, any()) } returns testSearchResult

        val response = controller.getNotes(householdId, selectedPage)

        assertThat(response.items).hasSize(notes.size)
        assertThat(response.items).isEqualTo(notes)
        assertThat(response.currentPage).isEqualTo(selectedPage)
        assertThat(response.pageSize).isEqualTo(5)
        assertThat(response.totalCount).isEqualTo(2)
        assertThat(response.totalPages).isEqualTo(1)

        verify { service.getNotes(householdId, selectedPage) }
    }

    @Test
    fun `create new note - successful`() {
        val householdId = 123L
        val note = "test note"

        val noteItem = HouseholdNoteItem(
            author = "author 2",
            timestamp = LocalDateTime.now().minusDays(1),
            note = "note 2",
        )
        every { service.createNewNote(householdId, note) } returns noteItem

        val response = controller.createNewNote(
            householdId = householdId,
            request = CreateHouseholdNoteRequest(note = note),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(noteItem)
        verify { service.createNewNote(householdId, note) }
    }
}
