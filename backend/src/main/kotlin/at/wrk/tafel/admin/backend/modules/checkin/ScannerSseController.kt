package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/sse/scanners")
@PreAuthorize("hasAnyAuthority('SCANNER', 'CHECKIN')")
class ScannerSseController(
    private val sseOutboxService: SseOutboxService,
    private val sseEmitterFactory: SseEmitterFactory,
) {

    @GetMapping("/{scannerId}/results")
    fun listenForResults(@PathVariable scannerId: Int): SseEmitter {
        val sseEmitter = sseEmitterFactory.createSseEmitter()

        val acceptFilter = { result: ScanResult? ->
            result?.scannerId == scannerId
        }
        // The one stream that must not be replayed after a listener reconnect: a scan result is an
        // instruction ("show this customer"), not state. The check-in screen acts on it by loading
        // that customer and resetting the form, so a duplicate throws away a ticket number being
        // typed, and one delivered late pulls the screen to a customer scanned minutes ago. A
        // missed scan is the harmless outcome here - the card gets scanned again.
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            resultType = ScanResult::class.java,
            acceptFilter = acceptFilter,
            replayable = false,
        )

        return sseEmitter
    }
}
