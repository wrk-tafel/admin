package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.distribution.events.AllTicketsProcessedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.CheckinStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.FoodHandoutStartedEvent
import at.wrk.tafel.admin.backend.modules.logistics.events.FoodCollectionCompletedEvent
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.scheduling.annotation.Async

@ExtendWith(MockKExtension::class)
internal class DistributionPhasePushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: DistributionPhasePushListener

    @Test
    fun `broadcasts that the check-in desk has opened`() {
        listener.onCheckinStarted(CheckinStartedEvent(distributionId = 1))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.CHECKIN_STARTED,
                title = "Anmeldung gestartet",
                body = "Der erste Kunde wurde angemeldet.",
            )
        }
    }

    @Test
    fun `broadcasts that the food hand-out is running`() {
        listener.onFoodHandoutStarted(FoodHandoutStartedEvent(distributionId = 1))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.FOOD_HANDOUT_STARTED,
                title = "Warenausgabe gestartet",
                body = "Das erste Ticket wurde abgearbeitet, die Warenausgabe läuft.",
            )
        }
    }

    @Test
    fun `broadcasts how many customers were served once none are left`() {
        listener.onAllTicketsProcessed(AllTicketsProcessedEvent(distributionId = 1, ticketCount = 42))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.ALL_TICKETS_PROCESSED,
                title = "Alle Kunden abgearbeitet",
                body = "Alle 42 angemeldeten Kunden wurden abgearbeitet.",
            )
        }
    }

    @Test
    fun `broadcasts how many routes were recorded once the food collection is complete`() {
        listener.onFoodCollectionCompleted(FoodCollectionCompletedEvent(distributionId = 1, routeCount = 5))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.FOOD_COLLECTION_COMPLETED,
                title = "Warenerfassung abgeschlossen",
                body = "Für alle 5 aktiven Routen wurden die Waren erfasst.",
            )
        }
    }

    /**
     * All four are published from inside a request someone is waiting on - a check-in being saved, a
     * ticket being closed, a food collection being recorded - and each broadcast blocks on one HTTPS
     * send per subscribed device.
     */
    @Test
    fun `every phase broadcast runs off the publishing thread`() {
        val methods = mapOf(
            "onCheckinStarted" to CheckinStartedEvent::class.java,
            "onFoodHandoutStarted" to FoodHandoutStartedEvent::class.java,
            "onAllTicketsProcessed" to AllTicketsProcessedEvent::class.java,
            "onFoodCollectionCompleted" to FoodCollectionCompletedEvent::class.java,
        )

        methods.forEach { (name, eventType) ->
            val method = DistributionPhasePushListener::class.java.getDeclaredMethod(name, eventType)
            assertThat(method.isAnnotationPresent(Async::class.java))
                .describedAs("%s should be @Async", name)
                .isTrue()
        }
    }
}
