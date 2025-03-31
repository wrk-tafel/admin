package at.wrk.tafel.admin.backend.modules.distribution.internal.ticket

import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
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
        val ticketNumber = 123
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { service.getCurrentDistribution() } returns distributionEntity
        every { service.getCurrentTicketNumber(null) } returns ticketNumber

        controller.showCurrentTicket()

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticketnummer",
                    value = ticketNumber.toString()
                )
            )
        }
    }

    @Test
    fun `show current ticketNumber without active distribution`() {
        val ticketNumber = 123

        every { service.getCurrentDistribution() } returns null
        every { service.getCurrentTicketNumber(null) } returns ticketNumber

        controller.showCurrentTicket()

        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticketnummer",
                    value = null
                )
            )
        }
    }

    @Test
    fun `show next ticket`() {
        val nextTicketNumber = 123
        every { service.closeCurrentTicketAndGetNext() } returns nextTicketNumber

        controller.showNextTicket()

        verify { service.closeCurrentTicketAndGetNext() }
        verify {
            sseOutboxService.saveOutboxEntry(
                TICKET_SCREEN_SHOW_VALUE_NOTIFICATION_NAME,
                TicketScreenShowText(
                    text = "Ticketnummer",
                    value = nextTicketNumber.toString()
                )
            )
        }
    }

    @Test
    fun `show next ticket when ticket is null`() {
        every { service.closeCurrentTicketAndGetNext() } returns null

        controller.showNextTicket()

        val payloadSlot = slot<TicketScreenShowText>()
        verify { service.closeCurrentTicketAndGetNext() }
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
        val currentTicketNumber = 123
        val testValue = TicketScreenShowText(text = "Ticketnummer", value = currentTicketNumber.toString())

        every { service.getCurrentDistribution() } returns DistributionEntity()
        every { service.getCurrentTicketNumber() } returns currentTicketNumber

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
        val testValue = TicketScreenShowText(text = "Ticketnummer", value = null)

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
