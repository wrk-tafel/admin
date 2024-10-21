package at.wrk.tafel.admin.backend.modules.base.security.websocket

import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession
import java.util.*

class TafelWebSocketCloseTask(
    private val session: WebSocketSession
) : TimerTask() {
    override fun run() {
        session.close(CloseStatus.PROTOCOL_ERROR)
    }

}
