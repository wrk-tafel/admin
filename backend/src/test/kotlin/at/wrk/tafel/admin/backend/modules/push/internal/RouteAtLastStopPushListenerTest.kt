package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.scheduling.annotation.Async
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

@ExtendWith(MockKExtension::class)
internal class RouteAtLastStopPushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: RouteAtLastStopPushListener

    /**
     * Several routes are out at the same time, so the route has to be named - "eine Route kommt bald
     * zurück" tells nobody which dock to clear.
     */
    @Test
    fun `broadcasts which route is at its last stop and where`() {
        listener.onRouteAtLastStop(
            RouteAtLastStopEvent(routeId = 2, routeName = "Route 2", remainingStopName = "Denns BioMarkt"),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.ROUTE_AT_LAST_STOP,
                title = "Route 2 beim letzten Stopp",
                body = "Route 2 ist beim letzten Stopp (Denns BioMarkt) und kommt bald zurück.",
            )
        }
    }

    @Test
    fun `broadcasts without naming a stop that has neither shop nor description`() {
        listener.onRouteAtLastStop(
            RouteAtLastStopEvent(routeId = 2, routeName = "Route 2", remainingStopName = null),
        )

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.ROUTE_AT_LAST_STOP,
                title = "Route 2 beim letzten Stopp",
                body = "Route 2 ist beim letzten Stopp und kommt bald zurück.",
            )
        }
    }

    /**
     * Published from the request in which a driver ticks a stop off, on a phone connection at a shop,
     * and the broadcast blocks on one HTTPS send per subscribed device.
     */
    @Test
    fun `the broadcast runs off the publishing thread`() {
        val method = RouteAtLastStopPushListener::class.java
            .getDeclaredMethod("onRouteAtLastStop", RouteAtLastStopEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }

    /**
     * `RouteGuidanceService.publishIfAtLastStop` publishes from inside its own transaction, so a
     * rollback must not leave the notification sent - see the class KDoc.
     */
    @Test
    fun `the broadcast only fires after the publishing transaction commits`() {
        val method = RouteAtLastStopPushListener::class.java
            .getDeclaredMethod("onRouteAtLastStop", RouteAtLastStopEvent::class.java)

        val annotation = method.getAnnotation(TransactionalEventListener::class.java)
        assertThat(annotation).isNotNull()
        assertThat(annotation.phase).isEqualTo(TransactionPhase.AFTER_COMMIT)
        assertThat(annotation.fallbackExecution).isTrue()
    }
}
