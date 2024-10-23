package at.wrk.tafel.admin.backend.modules.dashboard.api

import at.wrk.tafel.admin.backend.modules.dashboard.api.model.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.service.internal.DashboardInternalService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/dashboard")
class DashboardController(
    private val simpMessagingTemplate: SimpMessagingTemplate,
    private val dashboardInternalService: DashboardInternalService
) {

    @SubscribeMapping
    fun getInitialMessage(): DashboardData {
        return dashboardInternalService.getData()
    }

    @Scheduled(fixedDelay = 2000)
    fun refreshDashboard() {
        val data = dashboardInternalService.getData()
        simpMessagingTemplate.convertAndSend("/topic/dashboard", data)
    }

}
