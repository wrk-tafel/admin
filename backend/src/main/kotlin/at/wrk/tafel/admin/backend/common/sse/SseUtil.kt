package at.wrk.tafel.admin.backend.common.sse

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

class SseUtil {

    companion object {
        private const val RECONNECT_TIME = 1000L

        fun createSseEmitter(): SseEmitter {
            val sseEmitter = SseEmitter()
            sseEmitter.send(SseEmitter.event().reconnectTime(RECONNECT_TIME))
            return sseEmitter
        }
    }

}
