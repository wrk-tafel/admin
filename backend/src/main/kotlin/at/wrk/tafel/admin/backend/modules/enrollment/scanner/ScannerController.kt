package at.wrk.tafel.admin.backend.modules.enrollment.scanner

import at.wrk.tafel.admin.backend.config.websocket.ScannerRegistry
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller
import org.springframework.web.socket.messaging.SessionConnectEvent
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.lang.Thread.sleep
import javax.annotation.PostConstruct


@Controller
class ScannerController(
    private val scannerRegistry: ScannerRegistry,
    private val brokerMessagingTemplate: SimpMessagingTemplate
) {
    private val logger = LoggerFactory.getLogger(ScannerController::class.java)

    @PostConstruct
    fun send() {
        while (false) {
            logger.info("SEND WS MESSAGE")
            brokerMessagingTemplate.convertAndSend("/test", "test123")
            sleep(500)
        }
    }

    @MessageMapping("/ws-api/scanners")
    fun greeting(message: String) {
        logger.info("GOT MSG: $message")
    }

    @EventListener
    fun handleScannerConnected(event: SessionConnectEvent) {
        val newId = scannerRegistry.getNewId()
        logger.info("New scanner connected with ID $newId")
    }

    @EventListener
    fun handleScannerDisconnected(event: SessionDisconnectEvent) {
        val clientId = event.user?.name
        if (clientId != null) {
            scannerRegistry.removeScanner(clientId.toInt())
            logger.info("Scanner disconnected with ID $clientId")
        } else {
            logger.warn("Scanner disconnected with unknown ID")
        }
    }

}
