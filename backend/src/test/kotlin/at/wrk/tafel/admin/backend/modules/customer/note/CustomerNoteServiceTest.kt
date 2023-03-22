package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerNoteRepository
import at.wrk.tafel.admin.backend.security.testUserEntity
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
internal class CustomerNoteServiceTest {

    @RelaxedMockK
    private lateinit var repository: CustomerNoteRepository

    @InjectMockKs
    private lateinit var service: CustomerNoteService

    @Test
    fun `get notes - empty`() {
        val customerId = 123L

        every { repository.findByCustomerIdOrderByCreatedAtDesc(customerId) } returns emptyList()

        val mappedNotes = service.getNotes(customerId)

        assertThat(mappedNotes).isEmpty()
        verify { repository.findByCustomerIdOrderByCreatedAtDesc(customerId) }
    }

    @Test
    fun `get notes - found`() {
        val customerId = 123L
        val noteEntities = listOf(
            CustomerNoteEntity().apply {
                this.user = testUserEntity
                this.createdAt = ZonedDateTime.now().minusDays(1)
                this.note = "note 2"
            },
            CustomerNoteEntity().apply {
                this.user = testUserEntity
                this.createdAt = ZonedDateTime.now().minusDays(2)
                this.note = "note 1"
            },
        )

        val notes = listOf(
            CustomerNoteItem(
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[0].createdAt!!,
                note = "note 2"
            ),
            CustomerNoteItem(
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[1].createdAt!!,
                note = "note 1"
            )
        )

        every { repository.findByCustomerIdOrderByCreatedAtDesc(customerId) } returns noteEntities

        val mappedNotes = service.getNotes(customerId)

        assertThat(mappedNotes).isEqualTo(notes)
        verify { repository.findByCustomerIdOrderByCreatedAtDesc(customerId) }
    }

}
