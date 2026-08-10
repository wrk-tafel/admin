package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.RouteGuidanceService
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteGuidanceStopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopCompletionRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDate
import java.time.LocalTime

@ExtendWith(MockKExtension::class)
class RouteGuidanceControllerTest {

    @RelaxedMockK
    private lateinit var routeGuidanceService: RouteGuidanceService

    @InjectMockKs
    private lateinit var controller: RouteGuidanceController

    private val testStop = RouteGuidanceStopItem(
        stopId = 11,
        time = LocalTime.of(8, 0),
        description = null,
        shop = null,
        completed = false,
        completedAt = null,
        completedBy = null,
        returnItems = emptyList(),
    )

    @Test
    fun `get guidance`() {
        val guidance = RouteGuidanceResponse(
            routeId = 1,
            routeNumber = 1.0,
            routeName = "Route 1",
            routeNote = null,
            date = LocalDate.of(2026, 8, 9),
            returnItemsFrom = null,
            stops = listOf(testStop),
            unassignedReturnItems = emptyList(),
        )
        every { routeGuidanceService.getGuidance(1) } returns guidance

        val response = controller.getGuidance(1)

        assertThat(response).isEqualTo(guidance)
        verify { routeGuidanceService.getGuidance(1) }
    }

    @Test
    fun `set stop completion`() {
        val completedStop = testStop.copy(completed = true)
        every { routeGuidanceService.setCompletion(1, 11, true) } returns completedStop

        val response = controller.setStopCompletion(1, 11, RouteStopCompletionRequest(completed = true))

        assertThat(response).isEqualTo(completedStop)
        verify { routeGuidanceService.setCompletion(1, 11, true) }
    }

    @Test
    fun `undo stop completion`() {
        every { routeGuidanceService.setCompletion(1, 11, false) } returns testStop

        val response = controller.setStopCompletion(1, 11, RouteStopCompletionRequest(completed = false))

        assertThat(response).isEqualTo(testStop)
        verify { routeGuidanceService.setCompletion(1, 11, false) }
    }
}
