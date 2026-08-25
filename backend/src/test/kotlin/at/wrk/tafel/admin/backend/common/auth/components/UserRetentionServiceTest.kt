package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifyOrder
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
class UserRetentionServiceTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var userDetailsManager: TafelUserDetailsManager

    private lateinit var properties: TafelAdminProperties
    private lateinit var service: UserRetentionService

    /** The moment the job actually fires, so the cutoffs below read like real ones. */
    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 25, 6, 15, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties()
        service = UserRetentionService(userRepository, userDetailsManager, properties, clock)
    }

    @Test
    fun `deletes every account expired past the configured retention window`() {
        properties.userDeletion.retentionTime = Period.ofYears(3)
        every { userRepository.findExpiredUserIdsSkipLocked(any(), any()) } returns listOf(1001L, 1002L)
        every { userRepository.findAllById(listOf(1001L, 1002L)) } returns listOf(
            testUser(1001L, "expired-one"),
            testUser(1002L, "expired-two"),
        )

        service.cleanupExpiredUsers()

        val cutoff = slot<LocalDateTime>()
        verifyOrder {
            userRepository.findExpiredUserIdsSkipLocked(capture(cutoff), UserPermissions.ADMINISTRATOR.key)
            userDetailsManager.deleteUser("expired-one")
            userDetailsManager.deleteUser("expired-two")
        }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2023, 8, 25, 6, 15))
    }

    /**
     * `ADMINISTRATOR` accounts are kept out of this job's reach entirely by the query itself
     * (`UserRepository.findExpiredUserIdsSkipLocked`'s `NOT EXISTS` against `users_authorities`,
     * covered against a real database by `ScheduledCleanupSkipLockedIT`) - this only pins down that
     * the service actually passes the permission key that query relies on, rather than some other
     * string.
     */
    @Test
    fun `passes the administrator authority key to the candidate query`() {
        every { userRepository.findExpiredUserIdsSkipLocked(any(), any()) } returns emptyList()

        service.cleanupExpiredUsers()

        verify { userRepository.findExpiredUserIdsSkipLocked(any(), "ADMINISTRATOR") }
    }

    /**
     * The default is what every deployment that doesn't say otherwise runs with, and it is a DSGVO
     * decision rather than a tuning knob - worth failing a test if it is changed by accident.
     */
    @Test
    fun `keeps seven years by default`() {
        every { userRepository.findExpiredUserIdsSkipLocked(any(), any()) } returns emptyList()

        service.cleanupExpiredUsers()

        val cutoff = slot<LocalDateTime>()
        verify { userRepository.findExpiredUserIdsSkipLocked(capture(cutoff), any()) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2019, 8, 25, 6, 15))
    }

    /**
     * Also proves the retention window really is a [Period], not a plain year count - a mixed
     * years+months value has to move the cutoff by both parts.
     */
    @Test
    fun `supports a retention window expressed in years and months`() {
        properties.userDeletion.retentionTime = Period.of(1, 6, 0)
        every { userRepository.findExpiredUserIdsSkipLocked(any(), any()) } returns emptyList()

        service.cleanupExpiredUsers()

        val cutoff = slot<LocalDateTime>()
        verify { userRepository.findExpiredUserIdsSkipLocked(capture(cutoff), any()) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2025, 2, 25, 6, 15))
    }

    @Test
    fun `a zero retention keeps every account rather than deleting them all`() {
        properties.userDeletion.retentionTime = Period.ZERO

        service.cleanupExpiredUsers()

        verify(exactly = 0) { userRepository.findExpiredUserIdsSkipLocked(any(), any()) }
        verify(exactly = 0) { userDetailsManager.deleteUser(any()) }
    }

    @Test
    fun `a negative retention keeps every account rather than deleting them all`() {
        properties.userDeletion.retentionTime = Period.ofYears(-1)

        service.cleanupExpiredUsers()

        verify(exactly = 0) { userRepository.findExpiredUserIdsSkipLocked(any(), any()) }
        verify(exactly = 0) { userDetailsManager.deleteUser(any()) }
    }

    @Test
    fun `the enabled switch keeps every account regardless of retentionTime`() {
        properties.userDeletion.enabled = false
        properties.userDeletion.retentionTime = Period.ofDays(1)

        service.cleanupExpiredUsers()

        verify(exactly = 0) { userRepository.findExpiredUserIdsSkipLocked(any(), any()) }
        verify(exactly = 0) { userDetailsManager.deleteUser(any()) }
    }

    @Test
    fun `nothing expired means nothing is deleted`() {
        every { userRepository.findExpiredUserIdsSkipLocked(any(), any()) } returns emptyList()

        service.cleanupExpiredUsers()

        verify(exactly = 0) { userDetailsManager.deleteUser(any()) }
    }

    private fun testUser(id: Long, username: String) = UserEntity(
        username = username,
        password = "irrelevant",
        employee = EmployeeEntity(personnelNumber = "$id", firstname = "first", lastname = "last"),
        enabled = true,
    ).apply { this.id = id }
}
