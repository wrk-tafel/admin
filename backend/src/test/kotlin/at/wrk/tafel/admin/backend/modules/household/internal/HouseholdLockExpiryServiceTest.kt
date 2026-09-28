package at.wrk.tafel.admin.backend.modules.household.internal

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
class HouseholdLockExpiryServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var householdService: HouseholdService

    /** The moment the job actually fires, so the cutoff below reads like a real one. */
    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 8, 25, 5, 50, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    private lateinit var service: HouseholdLockExpiryService

    @BeforeEach
    fun beforeEach() {
        service = HouseholdLockExpiryService(householdRepository, householdService, clock)
    }

    @Test
    fun `unlocks every household whose temporary lock has expired`() {
        every { householdRepository.findHouseholdIdsWithExpiredLockSkipLocked(any()) } returns listOf(1001L, 1002L)

        service.unlockExpiredLocks()

        val cutoff = slot<LocalDate>()
        verifyOrder {
            householdRepository.findHouseholdIdsWithExpiredLockSkipLocked(capture(cutoff))
            householdService.unlockHouseholdByHouseholdId(1001L)
            householdService.unlockHouseholdByHouseholdId(1002L)
        }
        assertThat(cutoff.captured).isEqualTo(LocalDate.of(2026, 8, 25))
    }

    @Test
    fun `nothing expired means nothing is unlocked`() {
        every { householdRepository.findHouseholdIdsWithExpiredLockSkipLocked(any()) } returns emptyList()

        service.unlockExpiredLocks()

        verify(exactly = 0) { householdService.unlockHouseholdByHouseholdId(any()) }
    }
}
