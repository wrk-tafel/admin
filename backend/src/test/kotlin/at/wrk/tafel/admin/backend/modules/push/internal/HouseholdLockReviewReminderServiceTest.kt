package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
internal class HouseholdLockReviewReminderServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: HouseholdLockReviewReminderService

    private val clock = Clock.fixed(
        ZonedDateTime.of(2026, 9, 28, 8, 10, 0, 0, ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault(),
    )

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply {
            householdLockReview.enabled = true
            householdLockReview.interval = Period.ofMonths(6)
        }
        service = HouseholdLockReviewReminderService(properties, householdRepository, pushBroadcastService, clock)
    }

    @Test
    fun `notifies with the number of locks due, measured against the interval`() {
        every { householdRepository.countLockReviewsDue(LocalDateTime.of(2026, 3, 28, 8, 10)) } returns 3

        service.remindAboutLocksDueForReview()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.HOUSEHOLD_LOCK_REVIEW_DUE,
                title = any(),
                body = match { it.startsWith("3 Kunden") },
            )
        }
    }

    @Test
    fun `stays silent when no lock is due`() {
        every { householdRepository.countLockReviewsDue(any()) } returns 0

        service.remindAboutLocksDueForReview()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `stays silent while the review is switched off`() {
        properties.householdLockReview.enabled = false
        every { householdRepository.countLockReviewsDue(any()) } returns 3

        service.remindAboutLocksDueForReview()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `stays silent for a zero or negative interval`() {
        every { householdRepository.countLockReviewsDue(any()) } returns 3

        properties.householdLockReview.interval = Period.ZERO
        service.remindAboutLocksDueForReview()
        properties.householdLockReview.interval = Period.ofDays(-1)
        service.remindAboutLocksDueForReview()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }
}
