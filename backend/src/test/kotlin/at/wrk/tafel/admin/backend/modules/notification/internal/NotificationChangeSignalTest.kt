package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class NotificationChangeSignalTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @Test
    fun `files an empty change signal in the sse outbox under the name its topic forwards`() {
        NotificationChangeSignal(sseOutboxService).signal()

        verify { sseOutboxService.saveOutboxEntry("notifications_changed", emptyMap<String, String>()) }
    }
}
