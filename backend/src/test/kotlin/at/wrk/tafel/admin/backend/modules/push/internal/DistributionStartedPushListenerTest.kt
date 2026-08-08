package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.DistributionStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
internal class DistributionStartedPushListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: DistributionStartedPushListener

    @BeforeEach
    fun beforeEach() {
        every { distributionRepository.findByIdOrNull(testDistributionEntity.id!!) } returns testDistributionEntity
    }

    @Test
    fun `unknown distribution id is a no-op`() {
        every { distributionRepository.findByIdOrNull(any()) } returns null

        listener.onDistributionStarted(DistributionStartedEvent(distributionId = 999L))

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = DistributionStartedPushListener::class.java
            .getDeclaredMethod("onDistributionStarted", DistributionStartedEvent::class.java)

        // Without @Async the blocking per-device sends would run on the thread that started the
        // distribution, keeping its request and transaction open for the whole fan-out.
        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }

    @Test
    fun `broadcasts a push with the distribution's start date`() {
        listener.onDistributionStarted(DistributionStartedEvent(distributionId = testDistributionEntity.id!!))

        val dateFormatted = testDistributionEntity.startedAt!!.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.DISTRIBUTION_STARTED,
                title = "Ausgabe gestartet",
                body = "Die Ausgabe vom $dateFormatted wurde gestartet.",
            )
        }
    }
}
