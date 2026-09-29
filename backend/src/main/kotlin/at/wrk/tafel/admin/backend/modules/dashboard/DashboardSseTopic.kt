package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@Component
class DashboardSseTopic(
    private val dashboardService: DashboardService,
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    companion object {
        const val DASHBOARD_UPDATE_NOTIFICATION_NAME = "dashboard_update"
    }

    override val name = "dashboard"

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        // Initial data
        sseOutboxService.sendEvent(emitter, dashboardService.getData(), name)

        sseOutboxService.listenForNotificationEvents<Unit>(
            sseEmitter = emitter,
            notificationName = DASHBOARD_UPDATE_NOTIFICATION_NAME,
            resultType = null,
        ) {
            sseOutboxService.sendEvent(emitter, dashboardService.getData(), name)
        }
    }
}
