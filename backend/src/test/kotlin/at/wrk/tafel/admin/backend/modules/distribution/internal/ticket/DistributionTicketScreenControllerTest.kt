package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController.Companion.TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
internal class DistributionTicketScreenControllerTest {

    @RelaxedMockK
    private lateinit var service: DistributionService

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var controller: DistributionTicketScreenController

    @Test
    fun `show text`() {
        val testText = "Test Text"
        val testValue = "123213"
        val requestBody = TicketScreenShowTextRequest(
            text = testText,
            value = testValue,
        )

        controller.showText(requestBody)

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowTextRequest(
                    text = testText,
                    value = testValue,
                ),
            )
        }
    }

    @Test
    fun `show current ticketNumber with active distribution`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = 50, householdId = 100, pendingCostContribution = BigDecimal("12.00"))
        every { service.getCurrentTicketScreenTicket() } returns expectedResponse

        val response = controller.showCurrentTicket()

        assertThat(response).isEqualTo(expectedResponse)
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowTextRequest(
                    text = "Ticket",
                    value = "50",
                ),
            )
        }
    }

    @Test
    fun `show current ticketNumber without active distribution`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = null, householdId = null, pendingCostContribution = null)
        every { service.getCurrentTicketScreenTicket() } returns expectedResponse

        val response = controller.showCurrentTicket()

        assertThat(response).isEqualTo(expectedResponse)
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowTextRequest(
                    text = "Ticket",
                    value = null,
                ),
            )
        }
    }

    @Test
    fun `show previous ticket`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = 123, householdId = 200, pendingCostContribution = BigDecimal("5.00"))
        every { service.reopenAndGetPreviousTicket() } returns expectedResponse

        val response = controller.showPreviousTicket()

        assertThat(response).isEqualTo(expectedResponse)
        verify { service.reopenAndGetPreviousTicket() }
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowTextRequest(
                    text = "Ticket",
                    value = "123",
                ),
            )
        }
    }

    @Test
    fun `show previous ticket when ticket is null`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = null, householdId = null, pendingCostContribution = null)
        every { service.reopenAndGetPreviousTicket() } returns expectedResponse

        val response = controller.showPreviousTicket()

        assertThat(response).isEqualTo(expectedResponse)

        val payloadSlot = slot<TicketScreenShowTextRequest>()
        verify { service.reopenAndGetPreviousTicket() }
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                payload = capture(payloadSlot),
            )
        }

        val payload = payloadSlot.captured
        assertThat(payload).isNotNull
        assertThat(payload.value).isNull()
    }

    @Test
    fun `show next ticket`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = 123, householdId = 300, pendingCostContribution = BigDecimal("0.00"))
        every { service.closeCurrentTicketAndGetNext(false) } returns expectedResponse

        val response = controller.showNextTicket(TicketScreenShowNextTicketRequest(costContributionPaid = false))

        assertThat(response).isEqualTo(expectedResponse)
        verify { service.closeCurrentTicketAndGetNext(false) }
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowTextRequest(
                    text = "Ticket",
                    value = "123",
                ),
            )
        }
    }

    @Test
    fun `show next ticket without a new decision passes null through to the service`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = 124, householdId = 300, pendingCostContribution = BigDecimal("0.00"))
        every { service.closeCurrentTicketAndGetNext(null) } returns expectedResponse

        val response = controller.showNextTicket(TicketScreenShowNextTicketRequest(costContributionPaid = null))

        assertThat(response).isEqualTo(expectedResponse)
        verify { service.closeCurrentTicketAndGetNext(null) }
    }

    @Test
    fun `show next ticket when ticket is null`() {
        val expectedResponse = TicketScreenTicketResponse(ticketNumber = null, householdId = null, pendingCostContribution = null)
        every { service.closeCurrentTicketAndGetNext(true) } returns expectedResponse

        val response = controller.showNextTicket(TicketScreenShowNextTicketRequest(costContributionPaid = true))

        assertThat(response).isEqualTo(expectedResponse)

        val payloadSlot = slot<TicketScreenShowTextRequest>()
        verify { service.closeCurrentTicketAndGetNext(true) }
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                payload = capture(payloadSlot),
            )
        }

        val payload = payloadSlot.captured
        assertThat(payload).isNotNull
        assertThat(payload.value).isNull()
    }
}
