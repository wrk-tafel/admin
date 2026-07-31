package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.sse.SseUtil
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
) {

    @GetMapping("/{scannerId}/results")
    fun listenForResults(@PathVariable scannerId: Int): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        val acceptFilter = { result: ScanResult? ->
            result?.scannerId == scannerId
        }
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            resultType = ScanResult::class.java,
            acceptFilter = acceptFilter,
        )

        return sseEmitter
    }
}
