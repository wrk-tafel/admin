package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
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
import org.junit.jupiter.api.assertThrows
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

        testHouseholdEntity1 = HouseholdEntity(householdId = 100, validUntil = LocalDate.now(), locked = false).apply {
            id = 1
            issuer = testUserEntity.employee
            createdAt = LocalDateTime.now()
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
        }

        val mainPersonEntity = PersonEntity(household = testHouseholdEntity1, country = testCountry1, isMainPerson = true).apply {
            id = 1
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
        }

        val addPerson1 = PersonEntity(household = testHouseholdEntity1, country = testCountry1).apply {
            id = 2
            lastname = "Add pers 1"
            firstname = "Add pers 1"
            birthDate = LocalDate.now().minusYears(5)
            income = BigDecimal("100")
            incomeDue = LocalDate.now()
            excludeFromHousehold = false
        }

        val addPerson2 = PersonEntity(household = testHouseholdEntity1, country = testCountry1).apply {
            id = 3
            lastname = "Add pers 2"
            firstname = "Add pers 2"
            birthDate = LocalDate.now().minusYears(2)
            excludeFromHousehold = true
        }

        testHouseholdEntity1.persons = mutableListOf(mainPersonEntity, addPerson1, addPerson2)
        testHouseholdEntity1.mainPerson = mainPersonEntity
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get notes - empty`() {
        val householdId = 123L

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val page = PageImpl(emptyList<HouseholdNoteEntity>(), pageRequest, 0)
        every {
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest)
        } returns page

        val searchResult = service.getNotes(householdId, selectedPage)

        assertThat(searchResult.items).isEmpty()
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(0)
        assertThat(searchResult.totalCount).isEqualTo(page.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest) }
    }

    @Test
    fun `get notes - found`() {
        val householdId = 123L
        val noteEntities = listOf(
            HouseholdNoteEntity(household = testHouseholdEntity1, note = "note 2").apply {
                this.id = 2
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(1)
            },
            HouseholdNoteEntity(household = testHouseholdEntity1, note = "note 1").apply {
                this.id = 1
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(2)
            },
        )

        val notes = listOf(
            HouseholdNoteItem(
                id = 2,
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[0].createdAt!!,
                note = "note 2",
            ),
            HouseholdNoteItem(
                id = 1,
                author = "test-personnelnumber test-firstname test-lastname",
                timestamp = noteEntities[1].createdAt!!,
                note = "note 1",
            ),
        )

        val selectedPage = 1
        val pageRequest = PageRequest.of(selectedPage - 1, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val pagedResult = PageImpl(noteEntities, pageRequest, 2)
        every {
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest)
        } returns pagedResult

        val searchResult = service.getNotes(householdId, selectedPage)

        assertThat(searchResult.items).isEqualTo(notes)
        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(1)
        assertThat(searchResult.totalCount).isEqualTo(pagedResult.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        verify { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest) }
    }

    @Test
    fun `get all notes - maps every note, unpaged`() {
        val householdId = 123L
        val noteEntities = listOf(
            HouseholdNoteEntity(household = testHouseholdEntity1, note = "note 2").apply {
                this.id = 2
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(1)
            },
            HouseholdNoteEntity(household = testHouseholdEntity1, note = "note 1").apply {
                this.id = 1
                this.employee = testUserEntity.employee
                this.createdAt = LocalDateTime.now().minusDays(2)
            },
        )
        every { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId) } returns noteEntities

        val result = service.getAllNotes(householdId)

        assertThat(result).extracting("note").containsExactly("note 2", "note 1")
        verify { householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId) }
    }

    @Test
    fun `get notes - author is shown as deleted once the linked employee was deleted`() {
        val householdId = 123L
        val noteEntity = HouseholdNoteEntity(household = testHouseholdEntity1, note = "note 1").apply {
            this.id = 1
            this.employee = null
            this.createdAt = LocalDateTime.now()
        }

        val selectedPage = 1
        val pageRequest = PageRequest.of(selectedPage - 1, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val pagedResult = PageImpl(listOf(noteEntity), pageRequest, 1)
        every {
            householdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc(householdId, pageRequest)
        } returns pagedResult

        val searchResult = service.getNotes(householdId, selectedPage)

        assertThat(searchResult.items).containsExactly(
            HouseholdNoteItem(
                id = 1,
                author = "Mitarbeiter gelöscht",
                timestamp = noteEntity.createdAt!!,
                note = "note 1",
            ),
        )
    }

    @Test
    fun `create new note`() {
        val note = "test note"

        val noteEntity = HouseholdNoteEntity(household = testHouseholdEntity1, note = note)
        noteEntity.id = 42
        noteEntity.createdAt = LocalDateTime.now()
        noteEntity.employee = testUserEntity.employee
        every { householdNoteRepository.save(any()) } returns noteEntity

        every { householdRepository.findByHouseholdId(testHouseholdEntity1.householdId) } returns testHouseholdEntity1

        val noteItem = service.createNewNote(householdId = testHouseholdEntity1.householdId, note = note)

        assertThat(noteItem.id).isEqualTo(42)
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

    @Test
    fun `update note - successful`() {
        val noteEntity = HouseholdNoteEntity(household = testHouseholdEntity1, note = "old text").apply {
            id = 42
            employee = testUserEntity.employee
            createdAt = LocalDateTime.now()
        }
        every {
            householdNoteRepository.findByIdAndHouseholdHouseholdId(42L, testHouseholdEntity1.householdId)
        } returns noteEntity
        every { householdNoteRepository.save(noteEntity) } returns noteEntity

        val noteItem = service.updateNote(householdId = testHouseholdEntity1.householdId, noteId = 42L, note = "new text")

        assertThat(noteEntity.note).isEqualTo("new text")
        assertThat(noteItem.id).isEqualTo(42)
        assertThat(noteItem.note).isEqualTo("new text")
        verify { householdNoteRepository.save(noteEntity) }
    }

    @Test
    fun `update note - not found`() {
        every { householdNoteRepository.findByIdAndHouseholdHouseholdId(any(), any()) } returns null

        assertThrows<NotFoundException> {
            service.updateNote(householdId = 100L, noteId = 999L, note = "new text")
        }
    }

    @Test
    fun `delete note - successful`() {
        val noteEntity = HouseholdNoteEntity(household = testHouseholdEntity1, note = "text").apply {
            id = 42
            employee = testUserEntity.employee
            createdAt = LocalDateTime.now()
        }
        every {
            householdNoteRepository.findByIdAndHouseholdHouseholdId(42L, testHouseholdEntity1.householdId)
        } returns noteEntity

        service.deleteNote(householdId = testHouseholdEntity1.householdId, noteId = 42L)

        verify { householdNoteRepository.delete(noteEntity) }
    }

    @Test
    fun `delete note - not found`() {
        every { householdNoteRepository.findByIdAndHouseholdHouseholdId(any(), any()) } returns null

        assertThrows<NotFoundException> {
            service.deleteNote(householdId = 100L, noteId = 999L)
        }
    }
}
