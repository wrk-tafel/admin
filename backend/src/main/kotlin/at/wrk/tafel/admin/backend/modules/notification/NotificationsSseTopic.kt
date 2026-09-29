package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.notification.internal.NotificationChangeSignal
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * The bell's "your list changed" signal, forwarded to every open session with no content: only the
 * client knows whose entries changed, and it finds out with one fetch.
 */
@Component
class NotificationsSseTopic(
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    override val name = "notifications"

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        sseOutboxService.listenForNotificationEvents<Unit>(
            sseEmitter = emitter,
            notificationName = NotificationChangeSignal.NOTIFICATION_NAME,
            resultType = null,
        ) {
            sseOutboxService.sendEvent(emitter, "{}", name)
        }
    }
}
