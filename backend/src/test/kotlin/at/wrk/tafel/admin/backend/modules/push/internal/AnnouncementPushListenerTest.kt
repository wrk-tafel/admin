package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.notification.AnnouncementPublishedEvent
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class AnnouncementPushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @Test
    fun `broadcasts the announcement without adding it to the inboxes a second time`() {
        AnnouncementPushListener(pushBroadcastService).onAnnouncementPublished(AnnouncementPublishedEvent("Titel", "Text"))

        verify { pushBroadcastService.broadcast(PushNotificationType.ANNOUNCEMENT, "Titel", "Text", false) }
    }

    @Test
    fun `shortens a long message for the notification`() {
        AnnouncementPushListener(pushBroadcastService).onAnnouncementPublished(AnnouncementPublishedEvent("Titel", "x".repeat(500)))

        verify { pushBroadcastService.broadcast(PushNotificationType.ANNOUNCEMENT, "Titel", "x".repeat(200), false) }
    }
}
