package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
internal class DistributionClosedPushListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: DistributionClosedPushListener

    @BeforeEach
    fun beforeEach() {
        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns testDistributionEntity
    }

    @Test
    fun `unknown distribution id is a no-op`() {
        every { distributionRepository.findByIdOrNull(any()) } returns null

        listener.onDistributionClosed(DistributionClosedEvent(distributionId = 999L))

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `broadcasts a push with the distribution's start date`() {
        listener.onDistributionClosed(DistributionClosedEvent(distributionId = testDistributionEntity.id!!))

        val dateFormatted = testDistributionEntity.startedAt!!.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.DISTRIBUTION_CLOSED,
                title = "Ausgabe beendet",
                body = "Die Ausgabe vom $dateFormatted wurde beendet, die Statistiken sind bereit.",
            )
        }
    }
}
