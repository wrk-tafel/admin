package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
internal class RetentionExpiryReminderServiceTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: RetentionExpiryReminderService

    private val clock = Clock.fixed(Instant.parse("2027-03-05T09:00:00Z"), ZoneOffset.UTC)
    private val now = LocalDateTime.of(2027, 3, 5, 9, 0)

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply {
            userDeletion.retentionTime = Period.ofYears(1)
            employeeDeletion.retentionTime = Period.ofYears(1)
            householdDeletion.retentionTime = Period.ofYears(7)
            userDeletion.retentionWarning = Period.ofDays(30)
            employeeDeletion.retentionWarning = Period.ofDays(30)
            householdDeletion.retentionWarning = Period.ofDays(30)
        }
        every { userRepository.countUsersLastActiveBefore(any(), any()) } returns 0
        every { householdRepository.countByValidUntilBefore(any()) } returns 0
        every { employeeRepository.countEmployeesLastUsedBefore(any()) } returns 0
        service = RetentionExpiryReminderService(properties, userRepository, householdRepository, employeeRepository, pushBroadcastService, clock)
    }

    @Test
    fun `measures each job by its own retention time and warning window`() {
        service.remindAboutExpiringData()

        // retention minus warning: 1y - 30d for users and employees, 7y - 30d for households
        verify { userRepository.countUsersLastActiveBefore(now.minusYears(1).plusDays(30), UserPermissions.ADMINISTRATOR.key) }
        verify { employeeRepository.countEmployeesLastUsedBefore(now.minusYears(1).plusDays(30)) }
        verify { householdRepository.countByValidUntilBefore(LocalDate.of(2020, 3, 5).plusDays(30)) }
    }

    @Test
    fun `sends one combined notification naming what is affected`() {
        every { userRepository.countUsersLastActiveBefore(any(), any()) } returns 3
        every { householdRepository.countByValidUntilBefore(any()) } returns 12
        every { employeeRepository.countEmployeesLastUsedBefore(any()) } returns 1

        service.remindAboutExpiringData()

        verify(exactly = 1) {
            pushBroadcastService.broadcast(
                type = PushNotificationType.RETENTION_EXPIRING,
                title = any(),
                body = match { it.startsWith("Benutzerkonten: 3, Kunden: 12, Mitarbeiter: 1 -") },
            )
        }
    }

    @Test
    fun `leaves out what has nothing expiring`() {
        every { householdRepository.countByValidUntilBefore(any()) } returns 2

        service.remindAboutExpiringData()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.RETENTION_EXPIRING,
                title = any(),
                body = match { it.startsWith("Kunden: 2 -") && !it.contains("Benutzerkonten") && !it.contains("Mitarbeiter") },
            )
        }
    }

    @Test
    fun `stays quiet when nothing is close to deletion`() {
        service.remindAboutExpiringData()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `a warning longer than the retention window counts everything`() {
        properties.userDeletion.retentionWarning = Period.ofYears(2)

        service.remindAboutExpiringData()

        // the cutoff is capped at now rather than lying in the future
        verify { userRepository.countUsersLastActiveBefore(now, UserPermissions.ADMINISTRATOR.key) }
    }

    @Test
    fun `a negative warning only counts what is already due`() {
        properties.userDeletion.retentionWarning = Period.ofDays(-5)

        service.remindAboutExpiringData()

        verify { userRepository.countUsersLastActiveBefore(now.minusYears(1), UserPermissions.ADMINISTRATOR.key) }
    }

    @Test
    fun `a job that is switched off, or has no retention time, is left out`() {
        properties.userDeletion.enabled = false
        properties.householdDeletion.retentionTime = Period.ZERO
        every { employeeRepository.countEmployeesLastUsedBefore(any()) } returns 4

        service.remindAboutExpiringData()

        verify(exactly = 0) { userRepository.countUsersLastActiveBefore(any(), any()) }
        verify(exactly = 0) { householdRepository.countByValidUntilBefore(any()) }
        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.RETENTION_EXPIRING,
                title = any(),
                body = match { it.startsWith("Mitarbeiter: 4 -") },
            )
        }
    }
}
