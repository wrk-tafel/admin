package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/dashboard")
class DashboardController(
    private val simpMessagingTemplate: SimpMessagingTemplate,
    private val dashboardService: DashboardService
) {

    @SubscribeMapping
    fun getInitialMessage(): DashboardData {
        return dashboardService.getData()
    }

    @Scheduled(fixedDelay = 2000)
    fun refreshDashboard() {
        val data = dashboardService.getData()
        simpMessagingTemplate.convertAndSend("/topic/dashboard", data)
    }

}
