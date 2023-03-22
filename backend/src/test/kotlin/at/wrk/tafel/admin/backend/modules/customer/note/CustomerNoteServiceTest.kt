package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerNoteRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity1
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.context.SecurityContextHolder
import java.time.ZonedDateTime
import java.util.*

@ExtendWith(MockKExtension::class)
internal class CustomerNoteServiceTest {

    @RelaxedMockK
    private lateinit var customerNoteRepository: CustomerNoteRepository

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var service: CustomerNoteService

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns Optional.of(testUserEntity)
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)
    }

    @Test
    fun `get notes - empty`() {
        val customerId = 123L

        every { customerNoteRepository.findByCustomerIdOrderByCreatedAtDesc(customerId) } returns emptyList()

        val mappedNotes = service.getNotes(customerId)

        assertThat(mappedNotes).isEmpty()
        verify { customerNoteRepository.findByCustomerIdOrderByCreatedAtDesc(customerId) }
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
            ), CustomerNoteItem(
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[1].createdAt!!,
                note = "note 1"
            )
        )

        every { customerNoteRepository.findByCustomerIdOrderByCreatedAtDesc(customerId) } returns noteEntities

        val mappedNotes = service.getNotes(customerId)

        assertThat(mappedNotes).isEqualTo(notes)
        verify { customerNoteRepository.findByCustomerIdOrderByCreatedAtDesc(customerId) }
    }

    @Test
    fun `create new note`() {
        val customerId = 123L
        val note = "test note"

        val noteEntity = CustomerNoteEntity()
        noteEntity.customer = testCustomerEntity1
        noteEntity.createdAt = ZonedDateTime.now()
        noteEntity.user = testUserEntity
        noteEntity.note = note
        every { customerNoteRepository.save(any()) } returns noteEntity

        every { customerRepository.findById(testCustomerEntity1.id!!) } returns Optional.of(testCustomerEntity1)

        val noteItem = service.createNewNote(customerId = customerId, note = note)

        assertThat(noteItem.author).isEqualTo("${testUser.personnelNumber} ${testUser.firstname} ${testUser.lastname}")
        assertThat(noteItem.timestamp).isEqualTo(noteEntity.createdAt)
        assertThat(noteItem.note).isEqualTo(note)

        verify {
            customerNoteRepository.save(withArg {
                assertThat(it.user).isEqualTo(testUserEntity)
                assertThat(it.customer).isEqualTo(testCustomerEntity1)
                assertThat(it.note).isEqualTo(note)
            })
        }
    }

}
