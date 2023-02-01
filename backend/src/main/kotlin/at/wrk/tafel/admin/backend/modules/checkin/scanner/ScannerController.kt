package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller
import java.util.*

@Controller
class ScannerController(
    private val scannerService: ScannerService
) {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/scanners/register")
    @SendToUser("/queue/scanners/registration")
    fun registerScanner(
        @AuthenticationPrincipal authentication: TafelJwtAuthentication
    ): ScannerRegistration {
        val id = scannerService.registerScanner(authentication.username!!)
        return ScannerRegistration(scannerId = id)
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
