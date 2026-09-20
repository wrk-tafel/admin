package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionUpdateResponse
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.atomic.AtomicReference

@RestController
@RequestMapping("/api/sse/distributions")
@PreAuthorize("isAuthenticated()")
class DistributionSseController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
    private val sseEmitterFactory: SseEmitterFactory,
) {

    companion object {
        /**
         * The name the database triggers file every change to what the dashboard shows under -
         * including a household being registered for the running distribution. Named here rather than
         * imported from `dashboard`, which this module has no dependency on.
         */
        private const val REGISTRATION_CHANGE_NOTIFICATION_NAME = "dashboard_update"
    }

    @GetMapping
    fun listenForDistributionUpdates(): SseEmitter {
        val sseEmitter = sseEmitterFactory.createSseEmitter()

        // initial data
        val initialUpdate = service.getCurrentDistributionUpdate()
        sseOutboxService.sendEvent(sseEmitter, initialUpdate)

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            resultType = DistributionUpdateResponse::class.java,
        )

        // The header shows the registered-customer count on every screen, so it rides on this stream
        // (which every session holds open anyway) instead of costing each one a second connection.
        // The trigger fires for much more than registrations, hence the send only on a changed count.
        val lastSentCount = AtomicReference(initialUpdate.registeredCustomers)
        sseOutboxService.listenForNotificationEvents<Unit>(
            sseEmitter = sseEmitter,
            notificationName = REGISTRATION_CHANGE_NOTIFICATION_NAME,
            resultType = null,
        ) {
            val update = service.getCurrentDistributionUpdate()
            // Start/close events above deliberately carry no count - they are published from the
            // request that caused them and can be delivered after newer counts. So the first count of
            // a distribution (0) also comes from here, and a closed one must not suppress the next.
            if (update.registeredCustomers == null) {
                lastSentCount.set(null)
            } else if (lastSentCount.getAndSet(update.registeredCustomers) != update.registeredCustomers) {
                sseOutboxService.sendEvent(sseEmitter, update)
            }
        }

        return sseEmitter
    }
}
