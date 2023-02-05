package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@RequestMapping("/api/scanners")
@MessageMapping("/scanners")
class ScannerController(
    private val scannerService: ScannerService
) {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    @MessageMapping("/register")
    @SendToUser("/queue/scanners/registration")
    fun registerScanner(
        @AuthenticationPrincipal authentication: TafelJwtAuthentication
    ): ScannerRegistration {
        val id = scannerService.registerScanner(authentication.username!!)
        return ScannerRegistration(scannerId = id)
    }

    @MessageMapping("/result")
    fun retrieveScanResult(result: ScanResult) {
        logger.info("GOT SCANRESULT: $result")
        // TODO process result
    }

    @GetMapping
    fun getScannerIds(): ScannerIdsResponse {
        return ScannerIdsResponse(scannerIds = scannerService.getScannerIds())
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

@ExcludeFromTestCoverage
data class ScannerIdsResponse(
    val scannerIds: List<Int>
)
