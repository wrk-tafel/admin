package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.reporting.ReportMailFailedEvent
import at.wrk.tafel.admin.backend.security.testUserEntity
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
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class ReportMailFailedPushListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: ReportMailFailedPushListener

    private val distributionId = 123L

    @BeforeEach
    fun beforeEach() {
        val distribution = DistributionEntity(
            startedAt = LocalDateTime.parse("2024-03-02T13:30:00"),
            startedByUser = testUserEntity,
        ).apply { id = distributionId }
        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
    }

    @Test
    fun `broadcasts a push naming the mail and the distribution it belonged to`() {
        listener.onReportMailFailed(ReportMailFailedEvent(distributionId = distributionId, reportName = "Statistiken"))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.REPORT_MAIL_FAILED,
                title = "E-Mail nicht versendet",
                body = "Die E-Mail 'Statistiken' zur Ausgabe vom 02.03.2024 konnte nicht versendet werden.",
            )
        }
    }

    @Test
    fun `unknown distribution id is a no-op`() {
        every { distributionRepository.findByIdOrNull(any()) } returns null

        listener.onReportMailFailed(ReportMailFailedEvent(distributionId = 999L, reportName = "Statistiken"))

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    /**
     * Both paths that reach this - the automatic post-close chain and the manual resend, which is a
     * request thread already waiting on mail retries - would otherwise additionally wait on one
     * HTTPS send per subscribed device.
     */
    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = ReportMailFailedPushListener::class.java
            .getDeclaredMethod("onReportMailFailed", ReportMailFailedEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }
}
