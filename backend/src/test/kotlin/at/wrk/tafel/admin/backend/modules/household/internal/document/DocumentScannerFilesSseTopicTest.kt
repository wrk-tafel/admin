package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@ExtendWith(MockKExtension::class)
internal class DocumentScannerFilesSseTopicTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @Test
    fun `forwards the scanner file list as a named event and needs the documents permission`() {
        val emitter = mockk<SseEmitter>(relaxed = true)
        val topic = DocumentScannerFilesSseTopic(sseOutboxService)

        topic.subscribe(emitter, null)

        assertThat(topic.requiredAuthorities).containsExactly("CUSTOMER_DOCUMENTS")
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = emitter,
                notificationName = DocumentScannerWatcherService.NOTIFICATION_NAME,
                resultType = ScannerFileListResponse::class.java,
                eventName = "scanner-files",
            )
        }
    }
}
