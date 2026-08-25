package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
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
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
class HouseholdRetentionServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var householdService: HouseholdService

    private lateinit var properties: TafelAdminProperties
    private lateinit var service: HouseholdRetentionService

    /** The moment the job actually fires, so the cutoffs below read like real ones. */
    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 25, 6, 0, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties()
        service = HouseholdRetentionService(householdRepository, householdService, properties, clock)
    }

    @Test
    fun `deletes every household expired past the configured retention window`() {
        properties.householdDeletion.retentionYears = 3
        every { householdRepository.findExpiredHouseholdIdsSkipLocked(any()) } returns listOf(1001L, 1002L)

        service.cleanupExpiredHouseholds()

        val cutoff = slot<LocalDate>()
        verifyOrder {
            householdRepository.findExpiredHouseholdIdsSkipLocked(capture(cutoff))
            householdService.deleteHouseholdByHouseholdId(1001L)
            householdService.deleteHouseholdByHouseholdId(1002L)
        }
        assertThat(cutoff.captured).isEqualTo(LocalDate.of(2023, 8, 25))
    }

    /**
     * The default is what every deployment that doesn't say otherwise runs with, and it is a DSGVO
     * decision rather than a tuning knob - worth failing a test if it is changed by accident.
     */
    @Test
    fun `keeps seven years by default`() {
        every { householdRepository.findExpiredHouseholdIdsSkipLocked(any()) } returns emptyList()

        service.cleanupExpiredHouseholds()

        val cutoff = slot<LocalDate>()
        verify { householdRepository.findExpiredHouseholdIdsSkipLocked(capture(cutoff)) }
        assertThat(cutoff.captured).isEqualTo(LocalDate.of(2019, 8, 25))
    }

    @Test
    fun `a non-positive retention keeps every household rather than deleting them all`() {
        properties.householdDeletion.retentionYears = 0

        service.cleanupExpiredHouseholds()

        verify(exactly = 0) { householdRepository.findExpiredHouseholdIdsSkipLocked(any()) }
        verify(exactly = 0) { householdService.deleteHouseholdByHouseholdId(any()) }
    }

    @Test
    fun `the enabled switch keeps every household regardless of retentionYears`() {
        properties.householdDeletion.enabled = false
        properties.householdDeletion.retentionYears = 1

        service.cleanupExpiredHouseholds()

        verify(exactly = 0) { householdRepository.findExpiredHouseholdIdsSkipLocked(any()) }
        verify(exactly = 0) { householdService.deleteHouseholdByHouseholdId(any()) }
    }

    @Test
    fun `nothing expired means nothing is deleted`() {
        every { householdRepository.findExpiredHouseholdIdsSkipLocked(any()) } returns emptyList()

        service.cleanupExpiredHouseholds()

        verify(exactly = 0) { householdService.deleteHouseholdByHouseholdId(any()) }
    }
}
