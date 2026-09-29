package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/** `scanner-results:<scannerId>` - the scan results of one scanner, for the check-in screen paired with it. */
@Component
class ScannerResultsSseTopic(
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    override val name = "scanner-results"

    override val requiredAuthorities = setOf("SCANNER", "CHECKIN")

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        val scannerId = argument?.toIntOrNull()
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "scanner-results braucht eine Scanner-ID")

        val acceptFilter = { result: ScanResult? ->
            result?.scannerId == scannerId
        }
        // The one topic that must not be replayed after a listener reconnect: a scan result is an
        // instruction ("show this customer"), not state. The check-in screen acts on it by loading
        // that customer and resetting the form, so a duplicate throws away a ticket number being
        // typed, and one delivered late pulls the screen to a customer scanned minutes ago. A
        // missed scan is the harmless outcome here - the card gets scanned again.
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = emitter,
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            resultType = ScanResult::class.java,
            acceptFilter = acceptFilter,
            replayable = false,
            eventName = name,
        )
    }
}
