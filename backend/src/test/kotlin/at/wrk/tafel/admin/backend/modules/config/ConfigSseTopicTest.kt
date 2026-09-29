package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.internal.ConfigChangePublisher
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verifySequence
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@ExtendWith(MockKExtension::class)
internal class ConfigSseTopicTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var topic: ConfigSseTopic

    @Test
    fun `listen for config changes`() {
        val sseEmitter = mockk<SseEmitter>(relaxed = true)
        topic.subscribe(sseEmitter, null)

        // No initial event on subscribe, unlike the distribution stream: a page load already read
        // the current config from GET /api/config, this stream only carries what changes after it.
        verifySequence {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = ConfigChangePublisher.NOTIFICATION_NAME,
                resultType = ConfigResponse::class.java,
                eventName = "config",
            )
        }
    }
}
