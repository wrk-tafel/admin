package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.common.sse.SseEmitterFactory
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.config.internal.ConfigChangePublisher
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verifySequence
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ConfigSseControllerTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @RelaxedMockK
    private lateinit var sseEmitterFactory: SseEmitterFactory

    @InjectMockKs
    private lateinit var controller: ConfigSseController

    @Test
    fun `listen for config changes`() {
        val sseEmitter = controller.listenForConfigChanges()
        assertThat(sseEmitter).isNotNull

        // No initial event on subscribe, unlike the distribution stream: a page load already read
        // the current config from GET /api/config, this stream only carries what changes after it.
        verifySequence {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = sseEmitter,
                notificationName = ConfigChangePublisher.NOTIFICATION_NAME,
                resultType = ConfigResponse::class.java,
            )
        }
    }
}
