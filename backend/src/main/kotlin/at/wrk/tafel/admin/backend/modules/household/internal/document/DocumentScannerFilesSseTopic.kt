package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.sse.SseTopic
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@Component
class DocumentScannerFilesSseTopic(
    private val sseOutboxService: SseOutboxService,
) : SseTopic {

    override val name = "scanner-files"

    override val requiredAuthorities = setOf("CUSTOMER_DOCUMENTS")

    override fun subscribe(emitter: SseEmitter, argument: String?) {
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = emitter,
            notificationName = DocumentScannerWatcherService.NOTIFICATION_NAME,
            resultType = ScannerFileListResponse::class.java,
            eventName = name,
        )
    }
}
