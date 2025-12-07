package at.wrk.tafel.admin.backend.common.sse

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

class SseUtil {

    companion object {
        private const val RECONNECT_TIME = 1000L
        private const val SSE_TIMEOUT = 12 * 60 * 60 * 1000L // 12 hours

        fun createSseEmitter(): SseEmitter {
            val sseEmitter = SseEmitter(SSE_TIMEOUT)
            sseEmitter.send(SseEmitter.event().reconnectTime(RECONNECT_TIME))
            return sseEmitter
        }
    }

}
