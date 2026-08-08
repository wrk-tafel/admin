package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.internal.ConfigChangePublisher
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
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
@RestController
@RequestMapping("/api/sse/config")
@PreAuthorize("isAuthenticated()")
class ConfigSseController(
    private val sseOutboxService: SseOutboxService,
) {

    @GetMapping
    fun listenForConfigChanges(): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = ConfigChangePublisher.NOTIFICATION_NAME,
            resultType = ConfigResponse::class.java,
        )
        return sseEmitter
    }
}
