package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdLockReason
import at.wrk.tafel.admin.backend.modules.household.HouseholdLockRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import at.wrk.tafel.admin.backend.database.model.household.HouseholdLockReason as HouseholdLockReasonEntity

@ExtendWith(MockKExtension::class)
class HouseholdLockServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var householdConverter: HouseholdConverter

    private val now = ZonedDateTime.of(2026, 10, 3, 8, 0, 0, 0, ZoneId.systemDefault())
    private val clock = Clock.fixed(now.toInstant(), ZoneId.systemDefault())

    private val response = mockk<HouseholdResponse>()

    private lateinit var service: HouseholdLockService

    @BeforeEach
    fun beforeEach() {
        service = HouseholdLockService(householdRepository, userRepository, householdConverter, clock)
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } answers { firstArg() }
        every { householdConverter.mapEntityToHousehold(any()) } returns response
    }

    @Test
    fun `locking stamps the lock on the stored household`() {
        // an incomplete household: no persons, no address - nothing here is the request's to supply
        val household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2027, 1, 1))
        every { householdRepository.findByHouseholdId(1) } returns household
        every { userRepository.findByUsername("locker") } returns testUserEntity

        val result = service.lockHousehold(
            1,
            HouseholdLockRequest(
                lockReason = "  Grund  ",
                lockReasonType = HouseholdLockReason.BANNED_FROM_PREMISES,
                lockedUntil = LocalDate.of(2026, 12, 1),
            ),
            "locker",
        )

        assertThat(result).isSameAs(response)
        assertThat(household.locked).isTrue()
        assertThat(household.lockedAt).isEqualTo(LocalDateTime.of(2026, 10, 3, 8, 0))
        assertThat(household.lockedBy).isSameAs(testUserEntity)
        assertThat(household.lockReason).isEqualTo("Grund")
        assertThat(household.lockReasonType).isEqualTo(HouseholdLockReasonEntity.BANNED_FROM_PREMISES)
        assertThat(household.lockedUntil).isEqualTo(LocalDate.of(2026, 12, 1))
        verify { householdRepository.saveAndFlush(household) }
    }

    @Test
    fun `locking without a category or an expiration date leaves both empty`() {
        val household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2027, 1, 1))
        every { householdRepository.findByHouseholdId(1) } returns household

        service.lockHousehold(1, HouseholdLockRequest(lockReason = "Grund"), "locker")

        assertThat(household.locked).isTrue()
        assertThat(household.lockReasonType).isNull()
        assertThat(household.lockedUntil).isNull()
    }

    @Test
    fun `locking an unknown household fails`() {
        every { householdRepository.findByHouseholdId(99) } returns null

        assertThatThrownBy { service.lockHousehold(99, HouseholdLockRequest(lockReason = "Grund"), "locker") }
            .isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `locking an already locked household fails and keeps the existing lock`() {
        val lockedAt = LocalDateTime.of(2026, 1, 1, 9, 0)
        val household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2027, 1, 1), locked = true).apply {
            this.lockedAt = lockedAt
            lockReason = "Erster Grund"
        }
        every { householdRepository.findByHouseholdId(1) } returns household

        assertThatThrownBy { service.lockHousehold(1, HouseholdLockRequest(lockReason = "Zweiter Grund"), "locker") }
            .isInstanceOf(BusinessRuleException::class.java)

        assertThat(household.lockedAt).isEqualTo(lockedAt)
        assertThat(household.lockReason).isEqualTo("Erster Grund")
        verify(exactly = 0) { householdRepository.saveAndFlush(any<HouseholdEntity>()) }
    }

    @Test
    fun `unlocking clears the lock and its review`() {
        val household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2027, 1, 1), locked = true).apply {
            lockedAt = LocalDateTime.of(2026, 1, 1, 9, 0)
            lockedBy = testUserEntity
            lockReason = "Grund"
            lockReasonType = HouseholdLockReasonEntity.OTHER
            lockedUntil = LocalDate.of(2027, 1, 1)
            lockReviewedAt = LocalDateTime.of(2026, 6, 1, 9, 0)
            lockReviewedBy = testUserEntity
        }
        every { householdRepository.findByHouseholdId(1) } returns household

        val result = service.unlockHousehold(1)

        assertThat(result).isSameAs(response)
        assertThat(household.locked).isFalse()
        assertThat(household.lockedAt).isNull()
        assertThat(household.lockedBy).isNull()
        assertThat(household.lockReason).isNull()
        assertThat(household.lockReasonType).isNull()
        assertThat(household.lockedUntil).isNull()
        assertThat(household.lockReviewedAt).isNull()
        assertThat(household.lockReviewedBy).isNull()
        verify { householdRepository.saveAndFlush(household) }
    }

    @Test
    fun `unlocking an unknown household fails`() {
        every { householdRepository.findByHouseholdId(99) } returns null

        assertThatThrownBy { service.unlockHousehold(99) }.isInstanceOf(NotFoundException::class.java)
    }
}
