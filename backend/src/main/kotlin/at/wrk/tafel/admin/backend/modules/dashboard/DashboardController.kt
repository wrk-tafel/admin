package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/dashboard")
class DashboardController(
    private val dashboardService: DashboardService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        const val DASHBOARD_UPDATE_NOTIFICATION_NAME = "dashboard_update"
    }

    @GetMapping("/sse")
    fun listenForDashboardData(): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        // Initial data
        val data = dashboardService.getData()
        sseOutboxService.sendEvent(sseEmitter, data)

        sseOutboxService.listenForNotificationEvents<Unit>(
            sseEmitter = sseEmitter,
            notificationName = DASHBOARD_UPDATE_NOTIFICATION_NAME,
            resultType = null
        ) {
            sseOutboxService.sendEvent(sseEmitter, dashboardService.getData())
        }

        return sseEmitter
    }

}
