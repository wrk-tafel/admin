package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/sse/document-scanner-files")
@PreAuthorize("hasAuthority('CUSTOMER')")
class DocumentScannerSseController(
    private val sseOutboxService: SseOutboxService,
    private val sseEmitterFactory: SseEmitterFactory,
) {

    @GetMapping
    fun listenForScannerFileChanges(): SseEmitter {
        val sseEmitter = sseEmitterFactory.createSseEmitter()
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = DocumentScannerWatcherService.NOTIFICATION_NAME,
            resultType = ScannerFileListResponse::class.java,
        )
        return sseEmitter
    }
}
