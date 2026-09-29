package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import org.springframework.stereotype.Component

/**
 * Tells every open session that a bell list changed, so the header reloads its own. The payload is
 * empty on purpose: which entries changed for whom is the client's to find out with one fetch.
 * Filed in the SSE outbox, so it is delivered when the surrounding transaction commits and reaches
 * every application instance; `distribution`'s stream (the one every session holds open) forwards it.
 */
@Component
class NotificationChangeSignal(
    private val sseOutboxService: SseOutboxService,
) {
    companion object {
        const val NOTIFICATION_NAME = "notifications_changed"
    }

    fun signal() {
        sseOutboxService.saveOutboxEntry(NOTIFICATION_NAME, emptyMap<String, String>())
    }
}
