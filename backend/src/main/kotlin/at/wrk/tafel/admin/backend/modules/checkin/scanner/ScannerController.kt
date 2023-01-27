package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.stereotype.Controller
import java.util.*
import kotlin.math.abs


@Controller
class ScannerController {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/scanners/register")
    // TODO build private channels for each client: https://www.baeldung.com/spring-websockets-send-message-to-user
    @SendTo("/topic/scanners/registration")
    fun registerScanner(headerAccessor: MessageHeaderAccessor): ScannerRegistration {
        val scannerId = abs(Random().nextInt()) // TODO generate id (atomic sequence)
        logger.info("Scanner registered - ID: $scannerId")
        return ScannerRegistration(scannerId = scannerId)
    }

    @MessageMapping("/scanners/result")
    fun retrieveScanResult(result: ScanResult) {
        logger.info("GOT SCANRESULT: $result")
    }

}

@ExcludeFromTestCoverage
data class ScanResult(
    val value: String
)

@ExcludeFromTestCoverage
data class ScannerRegistration(
    val scannerId: Int
)
