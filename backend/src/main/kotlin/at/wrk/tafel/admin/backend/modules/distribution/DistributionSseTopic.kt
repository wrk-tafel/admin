package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionUpdateResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.atomic.AtomicReference

@Component
class DistributionSseTopic(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    companion object {
        /**
         * The name the database triggers file every change to what the dashboard shows under -
         * including a household being registered for the running distribution. Named here rather than
         * imported from `dashboard`, which this module has no dependency on.
         */
        private const val REGISTRATION_CHANGE_NOTIFICATION_NAME = "dashboard_update"
    }

    override val name = "distribution"

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        // initial data
        val initialUpdate = service.getCurrentDistributionUpdate()
        sseOutboxService.sendEvent(emitter, initialUpdate, name)

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = emitter,
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            resultType = DistributionUpdateResponse::class.java,
            eventName = name,
        )

        // The header shows the registered-customer count on every screen, so it rides on this topic.
        // The trigger fires for much more than registrations, hence the send only on a changed count.
        val lastSentCount = AtomicReference(initialUpdate.registeredCustomers)
        sseOutboxService.listenForNotificationEvents<Unit>(
            sseEmitter = emitter,
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
                sseOutboxService.sendEvent(emitter, update, name)
            }
        }
    }
}
