package at.wrk.tafel.admin.backend.config.websocket

import at.wrk.tafel.admin.backend.modules.enrollment.scanner.ScannerWebSocketHandler
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.TextWebSocketHandler
import java.util.concurrent.atomic.AtomicInteger

@Component
class WebSocketClientRegistry : TextWebSocketHandler() {

    private val logger = LoggerFactory.getLogger(ScannerWebSocketHandler::class.java)

    private val clientCount = AtomicInteger(0)
    private val clientIdList = mutableListOf<Int>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val newId = getNewId()
        logger.info("New scanner connected with ID $newId")
        session.sendMessage(TextMessage(""))
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        val clientId = session.principal?.name
        if (clientId != null) {
            removeClient(clientId.toInt())
            logger.info("Scanner disconnected with ID $clientId")
        } else {
            logger.warn("Scanner disconnected with unknown ID")
        }
    }

    fun getNewId(): Int {
        val newId = clientCount.incrementAndGet()
        clientIdList.add(newId)
        return newId
    }

    fun removeClient(clientId: Int) {
        clientIdList.remove(clientId)
    }

}
