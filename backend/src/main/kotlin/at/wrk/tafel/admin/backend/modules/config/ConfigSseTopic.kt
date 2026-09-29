package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.internal.ConfigChangePublisher
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * Pushes the deployment config to open sessions whenever it changes on disk, so switching an
 * optional feature off in the backend's config file also takes it out of the UI of everyone who
 * already has the app open - without which the frontend would keep offering it until the next full
 * page load, which during a distribution may be hours away.
 *
 * Emits nothing on subscribe: `GET /api/config` is what a page load reads, this only carries the
 * deltas after it.
 */
@Component
class ConfigSseTopic(
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    override val name = "config"

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = emitter,
            notificationName = ConfigChangePublisher.NOTIFICATION_NAME,
            resultType = ConfigResponse::class.java,
            eventName = name,
        )
    }
}
