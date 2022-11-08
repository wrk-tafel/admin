package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/scanners")
class ScannerController {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/result")
    fun getScanResult(result: ScanResult) {
        logger.info("GOT SCANRESULT: $result")
    }

}

@ExcludeFromTestCoverage
data class ScanResult(
    val value: String
)
