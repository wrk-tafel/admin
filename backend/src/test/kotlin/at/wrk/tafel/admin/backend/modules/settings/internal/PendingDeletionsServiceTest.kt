package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeLastUseProjection
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
internal class PendingDeletionsServiceTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: PendingDeletionsService

    private val clock = Clock.fixed(Instant.parse("2027-03-05T09:00:00Z"), ZoneOffset.UTC)
    private val now = LocalDateTime.of(2027, 3, 5, 9, 0)

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply {
            userDeletion.retentionTime = Period.ofYears(1)
            employeeDeletion.retentionTime = Period.ofYears(1)
            householdDeletion.retentionTime = Period.ofYears(7)
        }
        service = PendingDeletionsService(properties, userRepository, householdRepository, employeeRepository, clock)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    private fun authenticateWith(vararg authorities: UserPermissions) {
        SecurityContextHolder.setContext(
            SecurityContextImpl(
                TafelJwtAuthentication(
                    tokenValue = "TOKEN",
                    username = "tester",
                    authorities = authorities.map { SimpleGrantedAuthority(it.key) },
                ),
            ),
        )
    }

    @Test
    fun `fills a section only for a caller holding the permission of its area`() {
        authenticateWith(UserPermissions.SETTINGS)

        val response = service.getPendingDeletions()

        assertThat(response.users).isNull()
        assertThat(response.households).isNull()
        assertThat(response.employees).isNotNull
        verify(exactly = 0) { userRepository.countUsersLastActiveBefore(any(), any()) }
        verify(exactly = 0) { householdRepository.countByValidUntilBefore(any()) }
    }

    @Test
    fun `a caller holding every area permission sees every section`() {
        authenticateWith(UserPermissions.SETTINGS, UserPermissions.USER_MANAGEMENT, UserPermissions.CUSTOMER)

        val response = service.getPendingDeletions()

        assertThat(response.users).isNotNull
        assertThat(response.households).isNotNull
        assertThat(response.employees).isNotNull
    }

    @Test
    fun `lists user accounts measured from their last login, or their creation when they never logged in`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        val loggedIn = TestdataGenerator.createUser().apply {
            id = 1
            lastLogin = LocalDateTime.of(2026, 3, 20, 12, 0)
            createdAt = LocalDateTime.of(2020, 1, 1, 0, 0)
        }
        val neverLoggedIn = TestdataGenerator.createUser().apply {
            id = 2
            createdAt = LocalDateTime.of(2026, 4, 1, 8, 0)
        }
        every { userRepository.countUsersLastActiveBefore(any(), UserPermissions.ADMINISTRATOR.key) } returns 2
        every { userRepository.findUsersLastActiveBefore(any(), UserPermissions.ADMINISTRATOR.key, any()) } returns listOf(loggedIn, neverLoggedIn)

        val users = service.getPendingDeletions().users!!

        assertThat(users.enabled).isTrue
        assertThat(users.totalCount).isEqualTo(2)
        assertThat(users.retentionText).isEqualTo("1 Jahr")
        assertThat(users.warningText).isEqualTo("30 Tagen")
        assertThat(users.items.map { it.deletionDate }).containsExactly(LocalDate.of(2027, 3, 20), LocalDate.of(2027, 4, 1))
        assertThat(users.items[0].lastLogin).isEqualTo(LocalDateTime.of(2026, 3, 20, 12, 0))
        assertThat(users.items[1].lastLogin).isNull()
        verify { userRepository.countUsersLastActiveBefore(now.minusYears(1).plusDays(30), UserPermissions.ADMINISTRATOR.key) }
    }

    @Test
    fun `lists households with their main person and the date they will be deleted`() {
        authenticateWith(UserPermissions.CUSTOMER)
        val household = HouseholdEntity(householdId = 4711, validUntil = LocalDate.of(2020, 4, 1))
        val withoutMainPerson = HouseholdEntity(householdId = 4712, validUntil = LocalDate.of(2020, 4, 2))
        every { householdRepository.countByValidUntilBefore(any()) } returns 2
        every { householdRepository.findAllByValidUntilBeforeOrderByValidUntilAscIdAsc(any(), any()) } returns listOf(household, withoutMainPerson)

        val households = service.getPendingDeletions().households!!

        assertThat(households.retentionText).isEqualTo("7 Jahren")
        assertThat(households.items.map { it.householdId }).containsExactly(4711L, 4712L)
        assertThat(households.items.map { it.deletionDate }).containsExactly(LocalDate.of(2027, 4, 1), LocalDate.of(2027, 4, 2))
        assertThat(households.items[1].name).isNull()
        verify { householdRepository.countByValidUntilBefore(LocalDate.of(2020, 3, 5).plusDays(30)) }
    }

    @Test
    fun `lists employees measured from their last use, or their creation when they were never used`() {
        authenticateWith(UserPermissions.SETTINGS)
        val used = employee(1, lastUsed = LocalDateTime.of(2026, 3, 25, 10, 0), createdAt = LocalDateTime.of(2020, 1, 1, 0, 0))
        val unused = employee(2, lastUsed = null, createdAt = LocalDateTime.of(2026, 4, 2, 10, 0))
        every { employeeRepository.countEmployeesLastUsedBefore(any()) } returns 2
        every { employeeRepository.findEmployeesLastUsedBefore(any(), PendingDeletionsService.MAX_ITEMS_PER_SECTION) } returns listOf(used, unused)

        val employees = service.getPendingDeletions().employees!!

        assertThat(employees.items.map { it.deletionDate }).containsExactly(LocalDate.of(2027, 3, 25), LocalDate.of(2027, 4, 2))
        assertThat(employees.items[1].lastUsed).isNull()
    }

    @Test
    fun `says how many there are even when the list is cut short`() {
        authenticateWith(UserPermissions.SETTINGS)
        every { employeeRepository.countEmployeesLastUsedBefore(any()) } returns 350
        every { employeeRepository.findEmployeesLastUsedBefore(any(), any()) } returns emptyList()

        val employees = service.getPendingDeletions().employees!!

        assertThat(employees.totalCount).isEqualTo(350)
        verify { employeeRepository.findEmployeesLastUsedBefore(any(), PendingDeletionsService.MAX_ITEMS_PER_SECTION) }
    }

    @Test
    fun `a job that is switched off lists nothing and says so`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.CUSTOMER, UserPermissions.SETTINGS)
        properties.userDeletion.enabled = false
        properties.householdDeletion.retentionTime = Period.ZERO

        val response = service.getPendingDeletions()

        assertThat(response.users!!.enabled).isFalse
        assertThat(response.users!!.items).isEmpty()
        assertThat(response.households!!.enabled).isFalse
        assertThat(response.employees!!.enabled).isTrue
        verify(exactly = 0) { userRepository.countUsersLastActiveBefore(any(), any()) }
        verify(exactly = 0) { householdRepository.countByValidUntilBefore(any()) }
    }

    private fun employee(id: Long, lastUsed: LocalDateTime?, createdAt: LocalDateTime): EmployeeLastUseProjection = mockk {
        every { this@mockk.id } returns id
        every { personnelNumber } returns "P$id"
        every { firstname } returns "first"
        every { lastname } returns "last"
        every { this@mockk.lastUsed } returns lastUsed
        every { this@mockk.createdAt } returns createdAt
    }
}
