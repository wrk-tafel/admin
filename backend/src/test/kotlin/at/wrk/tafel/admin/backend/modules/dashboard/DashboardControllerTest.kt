package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
internal class DashboardControllerTest {

    @RelaxedMockK
    private lateinit var simpMessagingTemplate: SimpMessagingTemplate

    @RelaxedMockK
    private lateinit var service: DashboardService

    @InjectMockKs
    private lateinit var controller: DashboardController

    @Test
    fun `get initial message`() {
        val data = DashboardData(
            registeredCustomers = 2,
            statistics = DashboardStatisticsData(
                employeeCount = 1,
                personsInShelterCount = 2
            ),
            logistics = DashboardLogisticsData(
                foodCollectionsRecordedCount = 1,
                foodCollectionsTotalCount = 2,
                foodAmountTotal = BigDecimal(3)
            )
        )
        every { service.getData() } returns data

        val response = controller.getInitialMessage()

        assertThat(response).isEqualTo(data)
        verify { service.getData() }
    }

    @Test
    fun `refresh dashboard`() {
        val data = DashboardData(
            registeredCustomers = 5,
            statistics = DashboardStatisticsData(
                employeeCount = 1,
                personsInShelterCount = 2
            ),
            logistics = DashboardLogisticsData(
                foodCollectionsRecordedCount = 1,
                foodCollectionsTotalCount = 2,
                foodAmountTotal = BigDecimal(3)
            )
        )
        every { service.getData() } returns data

        controller.refreshDashboard()

        verify { simpMessagingTemplate.convertAndSend("/topic/dashboard", data) }
    }

}
