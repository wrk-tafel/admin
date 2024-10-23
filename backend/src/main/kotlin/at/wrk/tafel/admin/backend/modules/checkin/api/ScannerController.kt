package at.wrk.tafel.admin.backend.modules.checkin.api

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.modules.checkin.service.internal.ScannerInternalService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class ScannerController(
    private val scannerInternalService: ScannerInternalService,
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
        val id = scannerInternalService.registerScanner(authentication.username!!)

        // publish new scanner to clients
        messagingTemplate.convertAndSend("/topic/scanners", createCurrentScannersResponse())

        return ScannerRegistration(scannerId = id)
    }

    private fun createCurrentScannersResponse() = ScannersResponse(scannerIds = scannerInternalService.getScannerIds())

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
