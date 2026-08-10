package at.wrk.tafel.admin.backend.common.sse

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import io.mockk.every
import io.mockk.mockkConstructor
import io.mockk.slot
import io.mockk.unmockkConstructor
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter.SseEventBuilder
import java.time.Duration

/**
 * Both values are configuration rather than constants - a deployment whose reverse proxy cuts idle
 * connections earlier than the default has to be able to say so without a rebuild.
 */
internal class SseEmitterFactoryTest {

    @Test
    fun `the configured timeout is how long a stream is held open`() {
        val factory = SseEmitterFactory(
            TafelAdminProperties().apply { sse.timeout = Duration.ofMinutes(90) },
        )

        val sseEmitter = factory.createSseEmitter()

        assertThat(sseEmitter.timeout).isEqualTo(Duration.ofMinutes(90).toMillis())
    }

    @Test
    fun `the configured reconnect time is what the browser is told to wait`() {
        mockkConstructor(SseEmitter::class)
        try {
            val eventSlot = slot<SseEventBuilder>()
            every { anyConstructed<SseEmitter>().send(capture(eventSlot)) } returns Unit
            val factory = SseEmitterFactory(
                TafelAdminProperties().apply { sse.reconnectTime = Duration.ofSeconds(5) },
            )

            factory.createSseEmitter()

            val event = eventSlot.captured.build().joinToString("") { it.data.toString() }
            assertThat(event).contains("retry:5000")
        } finally {
            unmockkConstructor(SseEmitter::class)
        }
    }
}
