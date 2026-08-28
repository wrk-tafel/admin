package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertEvent
import at.wrk.tafel.admin.backend.common.retention.RetentionRunAlertReason
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.scheduling.annotation.Async

@ExtendWith(MockKExtension::class)
internal class RetentionRunPushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: RetentionRunPushListener

    @Test
    fun `broadcasts a failure alert`() {
        listener.onRetentionRunAlert(
            RetentionRunAlertEvent(
                jobName = "Haushalts-Bereinigung",
                reason = RetentionRunAlertReason.FAILED,
                detail = "IllegalStateException: boom",
            ),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.RETENTION_RUN,
                title = "Bereinigungsjob fehlgeschlagen",
                body = "Haushalts-Bereinigung: IllegalStateException: boom",
            )
        }
    }

    @Test
    fun `broadcasts a ceiling-exceeded alert`() {
        listener.onRetentionRunAlert(
            RetentionRunAlertEvent(
                jobName = "Benutzer-Bereinigung",
                reason = RetentionRunAlertReason.CEILING_EXCEEDED,
                detail = "1000 Benutzer betroffen, Limit liegt bei 50.",
            ),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.RETENTION_RUN,
                title = "Bereinigungsjob übersprungen",
                body = "Benutzer-Bereinigung: 1000 Benutzer betroffen, Limit liegt bei 50.",
            )
        }
    }

    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = RetentionRunPushListener::class.java
            .getDeclaredMethod("onRetentionRunAlert", RetentionRunAlertEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }
}
