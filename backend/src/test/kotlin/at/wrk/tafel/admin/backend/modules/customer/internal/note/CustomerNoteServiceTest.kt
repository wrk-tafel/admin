package at.wrk.tafel.admin.backend.modules.customer.internal.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerNoteRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.base.testCountry
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
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

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

    private lateinit var testCustomerEntity1: CustomerEntity

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity.employee
            createdAt = LocalDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = false

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry
            addPerson2.excludeFromHousehold = true

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }
    }

    @Test
    fun `get notes - empty`() {
        val customerId = 123L

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, 5)
        val page = PageImpl(emptyList<CustomerNoteEntity>(), pageRequest, 0)
        every {
            customerNoteRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageRequest)
        } returns page

        val searchResult = service.getNotes(customerId, selectedPage)

        assertThat(searchResult.items).isEmpty()
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(0)
        assertThat(searchResult.totalCount).isEqualTo(page.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { customerNoteRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageRequest) }
    }

    @Test
    fun `get notes - found`() {
        val customerId = 123L
        val noteEntities = listOf(
            CustomerNoteEntity().apply {
                this.user = testUserEntity
                this.createdAt = LocalDateTime.now().minusDays(1)
                this.note = "note 2"
            },
            CustomerNoteEntity().apply {
                this.user = testUserEntity
                this.createdAt = LocalDateTime.now().minusDays(2)
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

        val selectedPage = 1
        val pageRequest = PageRequest.of(selectedPage - 1, 5)
        val pagedResult = PageImpl(noteEntities, pageRequest, 2)
        every {
            customerNoteRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageRequest)
        } returns pagedResult

        val searchResult = service.getNotes(customerId, selectedPage)

        assertThat(searchResult.items).isEqualTo(notes)
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(1)
        assertThat(searchResult.totalCount).isEqualTo(pagedResult.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { customerNoteRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageRequest) }
    }

    @Test
    fun `create new note`() {
        val note = "test note"

        val noteEntity = CustomerNoteEntity()
        noteEntity.customer = testCustomerEntity1
        noteEntity.createdAt = LocalDateTime.now()
        noteEntity.user = testUserEntity
        noteEntity.note = note
        every { customerNoteRepository.save(any()) } returns noteEntity

        every { customerRepository.findByCustomerId(testCustomerEntity1.customerId!!) } returns testCustomerEntity1

        val noteItem = service.createNewNote(customerId = testCustomerEntity1.customerId!!, note = note)

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
