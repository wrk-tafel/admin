package at.wrk.tafel.admin.backend.modules.enrollment.scanner

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.TextWebSocketHandler

@Component
class ScannerWebSocketHandler : TextWebSocketHandler() {
    private val logger = LoggerFactory.getLogger(ScannerWebSocketHandler::class.java)

    override fun handleTextMessage(session: WebSocketSession, message: TextMessage) {
        logger.info("Received msg: ${message.payload}")
    }

}
