package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
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
internal class HouseholdNoteServiceTest {

    @RelaxedMockK
    private lateinit var householdNoteRepository: HouseholdNoteRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var service: HouseholdNoteService

    private lateinit var testHouseholdEntity1: HouseholdEntity

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        testHouseholdEntity1 = HouseholdEntity().apply {
            id = 1
            issuer = testUserEntity.employee
            createdAt = LocalDateTime.now()
            householdId = 100
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            validUntil = LocalDate.now()
            locked = false

            val mainPersonEntity = PersonEntity()
            mainPersonEntity.id = 1
            mainPersonEntity.household = this
            mainPersonEntity.isMainPerson = true
            mainPersonEntity.lastname = "Mustermann"
            mainPersonEntity.firstname = "Max"
            mainPersonEntity.birthDate = LocalDate.now().minusYears(30)
            mainPersonEntity.country = testCountry1
            mainPersonEntity.employer = "Employer 123"
            mainPersonEntity.income = BigDecimal("1000")
            mainPersonEntity.incomeDue = LocalDate.now()

            val addPerson1 = PersonEntity()
            addPerson1.id = 2
            addPerson1.household = this
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry1
            addPerson1.excludeFromHousehold = false

            val addPerson2 = PersonEntity()
            addPerson2.id = 3
            addPerson2.household = this
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry1
            addPerson2.excludeFromHousehold = true

            persons = mutableListOf(mainPersonEntity, addPerson1, addPerson2)
            mainPerson = mainPersonEntity
        }
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get notes - empty`() {
        val householdId = 123L

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, 5)
        val page = PageImpl(emptyList<HouseholdNoteEntity>(), pageRequest, 0)
        every {
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId, pageRequest)
        } returns page

        val searchResult = service.getNotes(householdId, selectedPage)

        assertThat(searchResult.items).isEmpty()
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(0)
        assertThat(searchResult.totalCount).isEqualTo(page.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId, pageRequest) }
    }

    @Test
    fun `get notes - found`() {
        val householdId = 123L
        val noteEntities = listOf(
            HouseholdNoteEntity().apply {
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(1)
                this.note = "note 2"
            },
            HouseholdNoteEntity().apply {
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(2)
                this.note = "note 1"
            },
        )

        val notes = listOf(
            HouseholdNoteItem(
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[0].createdAt!!,
                note = "note 2",
            ),
            HouseholdNoteItem(
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[1].createdAt!!,
                note = "note 1",
            ),
        )

        val selectedPage = 1
        val pageRequest = PageRequest.of(selectedPage - 1, 5)
        val pagedResult = PageImpl(noteEntities, pageRequest, 2)
        every {
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId, pageRequest)
        } returns pagedResult

        val searchResult = service.getNotes(householdId, selectedPage)

        assertThat(searchResult.items).isEqualTo(notes)
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(1)
        assertThat(searchResult.totalCount).isEqualTo(pagedResult.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId, pageRequest) }
    }

    @Test
    fun `create new note`() {
        val note = "test note"

        val noteEntity = HouseholdNoteEntity()
        noteEntity.household = testHouseholdEntity1
        noteEntity.createdAt = LocalDateTime.now()
        noteEntity.employee = testUserEntity.employee
        noteEntity.note = note
        every { householdNoteRepository.save(any()) } returns noteEntity

        every { householdRepository.findByHouseholdId(testHouseholdEntity1.householdId!!) } returns testHouseholdEntity1

        val noteItem = service.createNewNote(householdId = testHouseholdEntity1.householdId!!, note = note)

        assertThat(noteItem.author).isEqualTo("${testUser.personnelNumber} ${testUser.firstname} ${testUser.lastname}")
        assertThat(noteItem.timestamp).isEqualTo(noteEntity.createdAt)
        assertThat(noteItem.note).isEqualTo(note)

        verify {
            householdNoteRepository.save(
                withArg {
                    assertThat(it.employee).isEqualTo(testUserEntity.employee)
                    assertThat(it.household).isEqualTo(testHouseholdEntity1)
                    assertThat(it.note).isEqualTo(note)
                },
            )
        }
    }
}
