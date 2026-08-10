package at.wrk.tafel.admin.backend.common.sse

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * Builds the emitter every SSE endpoint hands back, so all of them agree on how long a stream is
 * held open and how quickly the browser comes back after it ends.
 *
 * A bean rather than an object with constants: both values come from `tafeladmin.sse` and are read
 * here per emitter, so a change to them applies to streams opened afterwards without a restart (see
 * `ConfigFileReloadService`).
 */
@Component
class SseEmitterFactory(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    fun createSseEmitter(): SseEmitter {
        val sseProperties = tafelAdminProperties.sse
        val sseEmitter = SseEmitter(sseProperties.timeout.toMillis())
        sseEmitter.send(SseEmitter.event().reconnectTime(sseProperties.reconnectTime.toMillis()))
        return sseEmitter
    }
}
