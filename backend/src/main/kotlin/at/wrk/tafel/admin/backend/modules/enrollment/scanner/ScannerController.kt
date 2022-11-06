package at.wrk.tafel.admin.backend.modules.enrollment.scanner

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.stereotype.Controller

@Controller
class ScannerController {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/scanners")
    fun getScanResult(message: String) {
        logger.info("GOT SCANRESULT: $message")
    }

}
