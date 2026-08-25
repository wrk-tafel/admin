package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
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
class EmployeeRetentionServiceTest {

    @RelaxedMockK
    private lateinit var employeeRepository: EmployeeRepository

    @RelaxedMockK
    private lateinit var employeeService: EmployeeService

    private lateinit var properties: TafelAdminProperties
    private lateinit var service: EmployeeRetentionService

    /** The moment the job actually fires, so the cutoffs below read like real ones. */
    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 25, 6, 30, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties()
        service = EmployeeRetentionService(employeeRepository, employeeService, properties, clock)
    }

    @Test
    fun `deletes every unreferenced employee expired past the configured retention window`() {
        properties.employeeDeletion.retentionTime = Period.ofYears(3)
        every { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) } returns listOf(2001L, 2002L)

        service.cleanupExpiredEmployees()

        val cutoff = slot<LocalDateTime>()
        verifyOrder {
            employeeRepository.findExpiredEmployeeIdsSkipLocked(capture(cutoff))
            employeeService.deleteEmployee(2001L)
            employeeService.deleteEmployee(2002L)
        }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2023, 8, 25, 6, 30))
    }

    /**
     * The default is what every deployment that doesn't say otherwise runs with, and it is a DSGVO
     * decision rather than a tuning knob - worth failing a test if it is changed by accident.
     */
    @Test
    fun `keeps seven years by default`() {
        every { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) } returns emptyList()

        service.cleanupExpiredEmployees()

        val cutoff = slot<LocalDateTime>()
        verify { employeeRepository.findExpiredEmployeeIdsSkipLocked(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2019, 8, 25, 6, 30))
    }

    /**
     * Also proves the retention window really is a [Period], not a plain year count - a
     * months-only value has to move the cutoff by exactly that many months.
     */
    @Test
    fun `supports a retention window expressed in months`() {
        properties.employeeDeletion.retentionTime = Period.ofMonths(18)
        every { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) } returns emptyList()

        service.cleanupExpiredEmployees()

        val cutoff = slot<LocalDateTime>()
        verify { employeeRepository.findExpiredEmployeeIdsSkipLocked(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDateTime.of(2025, 2, 25, 6, 30))
    }

    @Test
    fun `a zero retention keeps every employee rather than deleting them all`() {
        properties.employeeDeletion.retentionTime = Period.ZERO

        service.cleanupExpiredEmployees()

        verify(exactly = 0) { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) }
        verify(exactly = 0) { employeeService.deleteEmployee(any()) }
    }

    @Test
    fun `a negative retention keeps every employee rather than deleting them all`() {
        properties.employeeDeletion.retentionTime = Period.ofYears(-1)

        service.cleanupExpiredEmployees()

        verify(exactly = 0) { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) }
        verify(exactly = 0) { employeeService.deleteEmployee(any()) }
    }

    @Test
    fun `the enabled switch keeps every employee regardless of retentionTime`() {
        properties.employeeDeletion.enabled = false
        properties.employeeDeletion.retentionTime = Period.ofDays(1)

        service.cleanupExpiredEmployees()

        verify(exactly = 0) { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) }
        verify(exactly = 0) { employeeService.deleteEmployee(any()) }
    }

    @Test
    fun `nothing expired means nothing is deleted`() {
        every { employeeRepository.findExpiredEmployeeIdsSkipLocked(any()) } returns emptyList()

        service.cleanupExpiredEmployees()

        verify(exactly = 0) { employeeService.deleteEmployee(any()) }
    }
}
