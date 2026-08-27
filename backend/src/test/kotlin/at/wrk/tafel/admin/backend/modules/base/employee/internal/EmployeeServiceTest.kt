package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.database.model.auth.EmployeeUserAccountProjection
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeItem
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeListResponse
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeRequest
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeResponse
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeUserAccount
import at.wrk.tafel.admin.backend.modules.base.employee.PersonnelNumberAvailabilityResponse
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class EmployeeServiceTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var employeeService: EmployeeService

    @Test
    fun `find employees with searchInput and page`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE, Sort.by("id"))
        val searchInput = "test-input"

        val employee1 = EmployeeEntity(personnelNumber = "00001", firstname = "first 1", lastname = "last 1").apply { id = 1 }
        val employee2 = EmployeeEntity(personnelNumber = "00002", firstname = "first 2", lastname = "last 2").apply { id = 2 }

        val pagedResult = PageImpl(listOf(employee1, employee2), pageRequest, 123)
        every { employeeRepository.findBySearchInput(searchInput, pageRequest) } returns pagedResult

        val response = employeeService.findEmployees(searchInput = searchInput, page = 1)

        assertThat(response).isEqualTo(
            EmployeeListResponse(
                items = listOf(
                    EmployeeItem(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
                    EmployeeItem(id = 2, personnelNumber = "00002", firstname = "first 2", lastname = "last 2"),
                ),
                totalCount = 123,
                currentPage = 1,
                totalPages = pagedResult.totalPages,
                pageSize = pageRequest.pageSize,
            ),
        )
    }

    @Test
    fun `find employees without searchInput and page`() {
        val employee1 = EmployeeEntity(personnelNumber = "00001", firstname = "first 1", lastname = "last 1").apply { id = 1 }

        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE, Sort.by("id"))
        val pagedResult = PageImpl(listOf(employee1), pageRequest, 123)
        every { employeeRepository.findAll(pageRequest) } returns pagedResult

        val response = employeeService.findEmployees()

        assertThat(response.items).isEqualTo(
            listOf(
                EmployeeItem(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1"),
            ),
        )
    }

    @Test
    fun `find employees carries the linked user account of every employee that has one`() {
        val employee1 = EmployeeEntity(personnelNumber = "00001", firstname = "first 1", lastname = "last 1").apply { id = 1 }
        val employee2 = EmployeeEntity(personnelNumber = "00002", firstname = "first 2", lastname = "last 2").apply { id = 2 }

        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE, Sort.by("id"))
        every { employeeRepository.findAll(pageRequest) } returns PageImpl(listOf(employee1, employee2), pageRequest, 2)
        every { userRepository.findAccountsByEmployeeIds(listOf(1, 2)) } returns listOf(userAccountProjection(employee = 2, user = 7, name = "user-7"))

        val response = employeeService.findEmployees()

        assertThat(response.items).isEqualTo(
            listOf(
                EmployeeItem(id = 1, personnelNumber = "00001", firstname = "first 1", lastname = "last 1", userAccount = null),
                EmployeeItem(
                    id = 2,
                    personnelNumber = "00002",
                    firstname = "first 2",
                    lastname = "last 2",
                    userAccount = EmployeeUserAccount(id = 7, username = "user-7"),
                ),
            ),
        )
    }

    @Test
    fun `find employees does not look up user accounts for an empty page`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE, Sort.by("id"))
        every { employeeRepository.findAll(pageRequest) } returns PageImpl(emptyList(), pageRequest, 0)

        employeeService.findEmployees()

        verify(exactly = 0) { userRepository.findAccountsByEmployeeIds(any()) }
    }

    @Test
    fun `personnel number is available when no employee holds it`() {
        every { employeeRepository.findByPersonnelNumber("00001") } returns null

        val response = employeeService.checkPersonnelNumberAvailability("  00001 ")

        assertThat(response).isEqualTo(PersonnelNumberAvailabilityResponse(available = true, existingEmployee = null))
    }

    @Test
    fun `personnel number is taken and reports who holds it`() {
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = 5 }
        every { employeeRepository.findByPersonnelNumber("00001") } returns existingEntity

        val response = employeeService.checkPersonnelNumberAvailability("00001")

        assertThat(response).isEqualTo(
            PersonnelNumberAvailabilityResponse(
                available = false,
                existingEmployee = EmployeeResponse(id = 5, personnelNumber = "00001", firstname = "first", lastname = "last"),
            ),
        )
    }

    @Test
    fun `personnel number of the edited employee itself is not a collision`() {
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = 5 }
        every { employeeRepository.findByPersonnelNumber("00001") } returns existingEntity

        val response = employeeService.checkPersonnelNumberAvailability("00001", excludedEmployeeId = 5)

        assertThat(response).isEqualTo(PersonnelNumberAvailabilityResponse(available = true, existingEmployee = null))
    }

    private fun userAccountProjection(employee: Long, user: Long, name: String) = object : EmployeeUserAccountProjection {
        override val employeeId = employee
        override val userId = user
        override val username = name
    }

    @Test
    fun `find employees with explicit valid pageSize`() {
        val pageRequest = PageRequest.of(0, 25, Sort.by("id"))
        every { employeeRepository.findAll(pageRequest) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = employeeService.findEmployees(page = 1, pageSize = 25)

        assertThat(response.pageSize).isEqualTo(25)
    }

    @Test
    fun `find employees with invalid pageSize falls back to default`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE, Sort.by("id"))
        every { employeeRepository.findAll(pageRequest) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = employeeService.findEmployees(page = 1, pageSize = 7)

        assertThat(response.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `find employee by searchInput not found`() {
        every { employeeRepository.findBySearchInput(any(), any()) } returns Page.empty()

        val response = employeeService.findEmployees(searchInput = "0000X")

        assertThat(response.items).isEmpty()
    }

    @Test
    fun `save employee`() {
        val employeeCreateRequest = EmployeeRequest(
            personnelNumber = "   00001",
            firstname = "first 1  ",
            lastname = "last 1    ",
        )
        val entity = EmployeeEntity(personnelNumber = "00001", firstname = "first 1", lastname = "last 1").apply { id = 1 }
        every { employeeRepository.save(any()) } returns entity
        every { employeeRepository.findByPersonnelNumber(employeeCreateRequest.personnelNumber) } returns entity

        employeeService.saveEmployee(employeeCreateRequest)

        val entitySlot = slot<EmployeeEntity>()
        verify { employeeRepository.save(capture(entitySlot)) }

        val savedEntity = entitySlot.captured
        assertThat(savedEntity.personnelNumber).isEqualTo(employeeCreateRequest.personnelNumber.trim())
        assertThat(savedEntity.firstname).isEqualTo(employeeCreateRequest.firstname.trim())
        assertThat(savedEntity.lastname).isEqualTo(employeeCreateRequest.lastname.trim())
    }

    @Test
    fun `update employee`() {
        val employeeId = 1L
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "Old firstname", lastname = "Old lastname").apply { id = employeeId }
        val employeeUpdateRequest = EmployeeRequest(
            personnelNumber = "  00002",
            firstname = "New firstname  ",
            lastname = "New lastname   ",
        )
        every { employeeRepository.findByIdOrNull(employeeId) } returns existingEntity
        every { employeeRepository.existsByPersonnelNumberAndIdNot(any(), any()) } returns false
        every { employeeRepository.save(any()) } returns existingEntity

        val result = employeeService.updateEmployee(employeeId, employeeUpdateRequest)

        assertThat(result).isEqualTo(
            EmployeeResponse(
                id = employeeId,
                personnelNumber = "00002",
                firstname = "New firstname",
                lastname = "New lastname",
            ),
        )

        val entitySlot = slot<EmployeeEntity>()
        verify { employeeRepository.save(capture(entitySlot)) }

        val savedEntity = entitySlot.captured
        assertThat(savedEntity.personnelNumber).isEqualTo("00002")
        assertThat(savedEntity.firstname).isEqualTo("New firstname")
        assertThat(savedEntity.lastname).isEqualTo("New lastname")
    }

    @Test
    fun `update employee throws exception when not found`() {
        every { employeeRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> {
            employeeService.updateEmployee(
                99L,
                EmployeeRequest(personnelNumber = "00001", firstname = "first", lastname = "last"),
            )
        }
        assertThat(exception.body.detail).isEqualTo("Employee with id 99 not found")
    }

    @Test
    fun `update employee throws exception when personnelNumber already used by another employee`() {
        val employeeId = 1L
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = employeeId }
        every { employeeRepository.findByIdOrNull(employeeId) } returns existingEntity
        every { employeeRepository.existsByPersonnelNumberAndIdNot("00002", employeeId) } returns true

        val exception = assertThrows<ConflictException> {
            employeeService.updateEmployee(
                employeeId,
                EmployeeRequest(personnelNumber = "00002", firstname = "first", lastname = "last"),
            )
        }
        assertThat(exception.body.detail).isEqualTo("Mitarbeiter 00002 ist bereits vorhanden!")
    }

    @Test
    fun `delete employee removes it when not linked to a user account`() {
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = 99 }
        every { employeeRepository.findByIdOrNull(99L) } returns existingEntity
        every { userRepository.existsByEmployeeId(99L) } returns false

        employeeService.deleteEmployee(99L)

        verify { employeeRepository.delete(existingEntity) }
    }

    @Test
    fun `delete employee throws exception when not found`() {
        every { employeeRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> { employeeService.deleteEmployee(99L) }
        assertThat(exception.body.detail).isEqualTo("Mitarbeiter (ID: 99) nicht vorhanden!")
    }

    @Test
    fun `delete employee throws conflict when linked to a user account`() {
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = 99 }
        every { employeeRepository.findByIdOrNull(99L) } returns existingEntity
        every { userRepository.existsByEmployeeId(99L) } returns true

        val exception = assertThrows<ConflictException> { employeeService.deleteEmployee(99L) }
        assertThat(exception.body.detail).isEqualTo("Mitarbeiter hat ein Benutzerkonto und kann nicht gelöscht werden!")
        verify(exactly = 0) { employeeRepository.delete(any<EmployeeEntity>()) }
    }

    @Test
    fun `delete employee logs the deletion`() {
        val existingEntity = EmployeeEntity(personnelNumber = "00001", firstname = "first", lastname = "last").apply { id = 99 }
        every { employeeRepository.findByIdOrNull(99L) } returns existingEntity
        every { userRepository.existsByEmployeeId(99L) } returns false

        val logger = LoggerFactory.getLogger(EmployeeService::class.java) as Logger
        val originalLevel = logger.level
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
        logger.level = Level.DEBUG
        try {
            employeeService.deleteEmployee(99L)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.DEBUG)
                assertThat(it.formattedMessage).contains("Deleted employee").contains("99").contains("00001")
            }
        } finally {
            logger.detachAppender(logAppender)
            logger.level = originalLevel
        }
    }
}
