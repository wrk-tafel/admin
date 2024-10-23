package at.wrk.tafel.admin.backend.modules.dashboard.api

import at.wrk.tafel.admin.backend.modules.dashboard.api.model.DashboardData
import at.wrk.tafel.admin.backend.modules.dashboard.service.internal.DashboardInternalService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.messaging.simp.SimpMessagingTemplate

@ExtendWith(MockKExtension::class)
internal class DashboardControllerTest {

    @RelaxedMockK
    private lateinit var simpMessagingTemplate: SimpMessagingTemplate

    @RelaxedMockK
    private lateinit var service: DashboardInternalService

    @InjectMockKs
    private lateinit var controller: DashboardController

    @Test
    fun `get initial message`() {
        val data = DashboardData(registeredCustomers = 2)
        every { service.getData() } returns data

        val response = controller.getInitialMessage()

        assertThat(response).isEqualTo(data)
        verify { service.getData() }
    }

    @Test
    fun `refresh dashboard`() {
        val data = DashboardData(registeredCustomers = 5)
        every { service.getData() } returns data

        controller.refreshDashboard()

        verify { simpMessagingTemplate.convertAndSend("/topic/dashboard", data) }
    }

}
