package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardSseTopic.Companion.DASHBOARD_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
internal class DashboardSseTopicTest {

    @RelaxedMockK
    private lateinit var service: DashboardService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var topic: DashboardSseTopic

    @Test
    fun `listen for dashboard data`() {
        val data = DashboardData(
            registeredCustomers = 2,
            registeredPersons = 5,
            tickets = DashboardTicketsData(
                countProcessedTickets = 10,
                countTotalTickets = 123,
            ),
            statistics = DashboardStatisticsData(
                employeeCount = 1,
                selectedShelterNames = listOf("Shelter 1", "Shelter 2"),
            ),
            logistics = DashboardLogisticsData(
                foodCollectionsRecordedCount = 1,
                foodCollectionsTotalCount = 2,
                recordedRouteNames = listOf("Route 1"),
                allRouteNames = listOf("Route 1", "Route 2"),
                foodAmountTotal = BigDecimal(3),
                routeProgress = listOf(
                    DashboardRouteProgressItem(
                        routeId = 1,
                        routeNumber = 1.0,
                        routeName = "Route 1",
                        completedStops = 2,
                        totalStops = 3,
                    ),
                ),
            ),
            notes = "test-notes",
            lastDistribution = null,
            organizationOverview = null,
        )
        every { service.getData() } returns data

        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        verify { sseOutboxService.sendEvent(sseEmitter, data, "dashboard") }

        val callbackSlot = slot<(Void?) -> Unit>()
        verify {
            sseOutboxService.listenForNotificationEvents(
                sseEmitter = sseEmitter,
                notificationName = DASHBOARD_UPDATE_NOTIFICATION_NAME,
                resultType = null,
                resultCallback = capture(callbackSlot),
            )
        }

        val callback = callbackSlot.captured
        callback(null)

        verify { sseOutboxService.sendEvent(sseEmitter, data, "dashboard") }
    }
}
