package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
internal class DistributionStillOpenReminderServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    private lateinit var service: DistributionStillOpenReminderService

    // 2024-03-05, 08:00 UTC - the reminder's own scheduled time, so "today" and "an earlier day"
    // are unambiguous below.
    private val clock = Clock.fixed(Instant.parse("2024-03-05T08:00:00Z"), ZoneOffset.UTC)

    @BeforeEach
    fun beforeEach() {
        service = DistributionStillOpenReminderService(distributionRepository, pushBroadcastService, clock)
    }

    private fun openDistributionStartedAt(startedAt: LocalDateTime) {
        val distribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 1
            endedAt = null
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns distribution
    }

    @Test
    fun `notifies about a distribution left open on an earlier day`() {
        openDistributionStartedAt(LocalDateTime.parse("2024-03-02T13:30:00"))

        service.remindAboutStillOpenDistribution()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.DISTRIBUTION_STILL_OPEN,
                title = "Ausgabe noch offen",
                body = "Die Ausgabe vom 02.03.2024 wurde noch nicht beendet.",
            )
        }
    }

    /**
     * The distribution being open is normal for most of the day it runs on - notifying about it
     * then would fire during every single distribution and teach everyone to ignore this type.
     */
    @Test
    fun `stays quiet about a distribution started today`() {
        openDistributionStartedAt(LocalDateTime.parse("2024-03-05T07:00:00"))

        service.remindAboutStillOpenDistribution()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `stays quiet when the last distribution is already closed`() {
        val closed = DistributionEntity(
            startedAt = LocalDateTime.parse("2024-03-02T13:30:00"),
            startedByUser = testUserEntity,
        ).apply {
            id = 1
            endedAt = LocalDateTime.parse("2024-03-02T20:00:00")
        }
        every { distributionRepository.findFirstByOrderByIdDesc() } returns closed

        service.remindAboutStillOpenDistribution()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `stays quiet when there is no distribution at all`() {
        every { distributionRepository.findFirstByOrderByIdDesc() } returns null

        service.remindAboutStillOpenDistribution()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }
}
