package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
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
        val requestBody = TicketScreenShowText(
            text = testText,
            value = testValue
        )

        controller.showText(requestBody)

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = testText,
                    value = testValue
                )
            )
        }
    }

    @Test
    fun `show current ticketNumber with active distribution`() {
        every { service.getCurrentDistribution() } returns testDistributionEntity
        every { service.getCurrentTicketNumber(null) } returns testDistributionCustomerEntity1

        controller.showCurrentTicket()

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticket",
                    value = "50"
                )
            )
        }
    }

    @Test
    fun `show current ticketNumber without active distribution`() {
        every { service.getCurrentDistribution() } returns null
        every { service.getCurrentTicketNumber(null) } returns testDistributionCustomerEntity1

        controller.showCurrentTicket()

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticket",
                    value = null
                )
            )
        }
    }

    @Test
    fun `show previous ticket`() {
        val previousTicketNumber = 123
        every { service.reopenAndGetPreviousTicket() } returns previousTicketNumber

        controller.showPreviousTicket()

        verify { service.reopenAndGetPreviousTicket() }
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticket",
                    value = previousTicketNumber.toString()
                )
            )
        }
    }

    @Test
    fun `show previous ticket when ticket is null`() {
        every { service.reopenAndGetPreviousTicket() } returns null

        controller.showPreviousTicket()

        val payloadSlot = slot<TicketScreenShowText>()
        verify { service.reopenAndGetPreviousTicket() }
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                payload = capture(payloadSlot)
            )
        }

        val payload = payloadSlot.captured
        assertThat(payload).isNotNull
        assertThat(payload.value).isNull()
    }

    @Test
    fun `show next ticket`() {
        val nextTicketNumber = 123
        every { service.closeCurrentTicketAndGetNext(false) } returns nextTicketNumber

        controller.showNextTicket(TicketScreenShowNextTicketRequest(costContributionPaid = false))

        verify { service.closeCurrentTicketAndGetNext(false) }
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticket",
                    value = nextTicketNumber.toString()
                )
            )
        }
    }

    @Test
    fun `show next ticket when ticket is null`() {
        every { service.closeCurrentTicketAndGetNext(true) } returns null

        controller.showNextTicket(TicketScreenShowNextTicketRequest(costContributionPaid = true))

        val payloadSlot = slot<TicketScreenShowText>()
        verify { service.closeCurrentTicketAndGetNext(true) }
        verify {
            sseOutboxService.saveOutboxEntry(
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                payload = capture(payloadSlot)
            )
        }

        val payload = payloadSlot.captured
        assertThat(payload).isNotNull
        assertThat(payload.value).isNull()
    }

    @Test
    fun `listen for changes with active distribution`() {
        val testValue = TicketScreenShowText(text = "Ticket", value = "50")

        every { service.getCurrentDistribution() } returns DistributionEntity()
        every { service.getCurrentTicketNumber() } returns testDistributionCustomerEntity1

        val emitter = controller.listenForChanges()
        assertThat(emitter).isNotNull

        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowText::class.java
            )
        }

        verify { sseOutboxService.sendEvent(emitter, testValue) }
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowText::class.java
            )
        }
    }

    @Test
    fun `listen for changes without active distribution`() {
        val testValue = TicketScreenShowText(text = "Ticket", value = null)

        every { service.getCurrentDistribution() } returns null

        val emitter = controller.listenForChanges()
        assertThat(emitter).isNotNull

        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowText::class.java
            )
        }

        verify { sseOutboxService.sendEvent(emitter, testValue) }
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                resultType = TicketScreenShowText::class.java
            )
        }
    }

}
