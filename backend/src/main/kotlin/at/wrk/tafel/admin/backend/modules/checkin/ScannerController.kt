package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class ScannerController(
    private val scannerService: ScannerService,
    private val messagingTemplate: SimpMessagingTemplate
) {

    @SubscribeMapping("/scanners")
    fun getScanners(): ScannersResponse {
        return createCurrentScannersResponse()
    }

    @MessageMapping("/scanners/register")
    @SendToUser("/queue/scanners/registration")
    fun registerScanner(
        @AuthenticationPrincipal authentication: TafelJwtAuthentication
    ): ScannerRegistration {
        val id = scannerService.registerScanner(authentication.username!!)

        // publish new scanner to clients
        messagingTemplate.convertAndSend("/topic/scanners", createCurrentScannersResponse())

        return ScannerRegistration(scannerId = id)
    }

    private fun createCurrentScannersResponse() = ScannersResponse(scannerIds = scannerService.getScannerIds())

}

@ExcludeFromTestCoverage
data class ScanResult(
    val value: Int
)

@ExcludeFromTestCoverage
data class ScannerRegistration(
    val scannerId: Int
)

@ExcludeFromTestCoverage
data class ScannersResponse(
    val scannerIds: List<Int>
)
