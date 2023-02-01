package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.stereotype.Controller
import java.util.*
import kotlin.math.abs

@Controller
@EnableScheduling
class ScannerController {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/scanners/register")
    @SendToUser("/queue/scanners/registration")
    fun registerScanner(): ScannerRegistration {
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
