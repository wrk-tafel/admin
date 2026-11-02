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

    /** Computed once per change for every open dashboard, see `SseSharedSnapshot`. */
    private val dashboardData = sseOutboxService.sharedSnapshot(DASHBOARD_UPDATE_NOTIFICATION_NAME) {
        dashboardService.getData()
    }

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        // Initial data
        sseOutboxService.sendEvent(emitter, dashboardService.getData(), name)

        sseOutboxService.listenForSharedSnapshot(emitter, dashboardData) { data ->
            sseOutboxService.sendEvent(emitter, data, name)
        }
    }
}
