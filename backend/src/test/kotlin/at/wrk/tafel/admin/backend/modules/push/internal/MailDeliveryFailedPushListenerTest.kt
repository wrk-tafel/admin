package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailDeliveryFailedEvent
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
internal class MailDeliveryFailedPushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: MailDeliveryFailedPushListener

    @Test
    fun `broadcasts a push naming the mail by its type and outbox id, not its subject`() {
        listener.onMailDeliveryFailed(
            MailDeliveryFailedEvent(id = 123L, mailType = "Support-Anfrage", recipients = "support@localhost", lastError = "smtp is down"),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.REPORT_MAIL_FAILED,
                title = "E-Mail nicht versendet",
                body = "Support-Anfrage #123 konnte nicht versendet werden.",
            )
        }
    }

    /**
     * A row queued before the `mail_type` column existed has no label to name it by - falls back to
     * a generic one rather than a blank/"null" showing up in the notification.
     */
    @Test
    fun `falls back to a generic label when the mail has none`() {
        listener.onMailDeliveryFailed(
            MailDeliveryFailedEvent(id = 45L, mailType = null, recipients = "support@localhost", lastError = "smtp is down"),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.REPORT_MAIL_FAILED,
                title = "E-Mail nicht versendet",
                body = "E-Mail #45 konnte nicht versendet werden.",
            )
        }
    }

    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = MailDeliveryFailedPushListener::class.java
            .getDeclaredMethod("onMailDeliveryFailed", MailDeliveryFailedEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }
}
