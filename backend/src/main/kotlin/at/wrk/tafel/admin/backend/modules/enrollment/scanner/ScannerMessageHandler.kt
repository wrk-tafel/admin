package at.wrk.tafel.admin.backend.modules.enrollment.scanner

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.stereotype.Component

@Component
class ScannerMessageHandler {

    private val logger: Logger = LoggerFactory.getLogger(ScannerMessageHandler::class.java)

    @MessageMapping("/topic/scanners")
    fun getScanResult(@Payload message: String) {
        logger.info("GOT SCANRESULT: $message")
    }

}
