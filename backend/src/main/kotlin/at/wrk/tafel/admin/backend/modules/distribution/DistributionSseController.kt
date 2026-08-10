package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController.Companion.DISTRIBUTION_UPDATE_NOTIFICATION_NAME
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionUpdateResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/sse/distributions")
class DistributionSseController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
    private val sseEmitterFactory: SseEmitterFactory,
) {

    @GetMapping
    fun listenForDistributionUpdates(): SseEmitter {
        val sseEmitter = sseEmitterFactory.createSseEmitter()

        // initial data
        sseOutboxService.sendEvent(
            sseEmitter,
            DistributionUpdateResponse(distribution = service.getCurrentDistributionItem()),
        )

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            resultType = DistributionUpdateResponse::class.java,
        )

        return sseEmitter
    }
}
