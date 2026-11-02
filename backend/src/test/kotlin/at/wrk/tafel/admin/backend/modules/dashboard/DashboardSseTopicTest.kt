package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseSharedSnapshot
import at.wrk.tafel.admin.backend.modules.dashboard.DashboardSseTopic.Companion.DASHBOARD_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.dashboard.internal.DashboardService
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.math.BigDecimal
import java.util.concurrent.Executor

@ExtendWith(MockKExtension::class)
internal class DashboardSseTopicTest {

    @RelaxedMockK
    private lateinit var service: DashboardService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    private lateinit var topic: DashboardSseTopic

    private lateinit var dashboardData: SseSharedSnapshot<DashboardData>

    @BeforeEach
    fun beforeEach() {
        every { sseOutboxService.sharedSnapshot<DashboardData>(DASHBOARD_UPDATE_NOTIFICATION_NAME, any()) } answers {
            SseSharedSnapshot(firstArg(), Executor { it.run() }, secondArg<() -> DashboardData>())
                .also { dashboardData = it }
        }
        every { sseOutboxService.listenForSharedSnapshot<DashboardData>(any(), any(), any()) } answers {
            secondArg<SseSharedSnapshot<DashboardData>>().subscribe(thirdArg())
        }
        topic = DashboardSseTopic(service, sseOutboxService)
    }

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

        verify { sseOutboxService.listenForSharedSnapshot(sseEmitter, dashboardData, any()) }

        dashboardData.changed()

        verify(exactly = 2) { sseOutboxService.sendEvent(sseEmitter, data, "dashboard") }
    }

    @Test
    fun `a change is computed once for every open dashboard`() {
        val data = mockk<DashboardData>()
        every { service.getData() } returns data
        val emitters = List(5) { mockk<SseEmitter>(relaxed = true) }
        emitters.forEach { topic.subscribe(it, null) }

        dashboardData.changed()

        // five initial snapshots, one for the change
        verify(exactly = 6) { service.getData() }
        emitters.forEach { verify(exactly = 2) { sseOutboxService.sendEvent(it, data, "dashboard") } }
    }
}
