package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.notification.internal.NotificationChangeSignal
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@ExtendWith(MockKExtension::class)
internal class NotificationsSseTopicTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @Test
    fun `forwards every change signal as an empty named event`() {
        val emitter = mockk<SseEmitter>(relaxed = true)
        val callback = slot<(Unit?) -> Unit>()

        NotificationsSseTopic(sseOutboxService).subscribe(emitter, null)

        verify {
            sseOutboxService.listenForNotificationEvents<Unit>(
                sseEmitter = emitter,
                notificationName = NotificationChangeSignal.NOTIFICATION_NAME,
                resultType = null,
                resultCallback = capture(callback),
            )
        }
        callback.captured(null)
        verify(exactly = 1) { sseOutboxService.sendEvent(emitter, "{}", "notifications") }
    }
}
