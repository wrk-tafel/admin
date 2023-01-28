package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller
import java.util.*
import kotlin.math.abs

@Controller
@EnableScheduling
class ScannerController(
    private val simpMessagingTemplate: SimpMessagingTemplate
) {

    private val logger: Logger = LoggerFactory.getLogger(ScannerController::class.java)

    private var counter: Int = 0

    @MessageMapping("/scanners/register")
    // TODO build private channels for each client: https://www.baeldung.com/spring-websockets-send-message-to-user
    @SendTo("/topic/scanners/registration")
    fun registerScanner(
        headerAccessor: MessageHeaderAccessor,
        @AuthenticationPrincipal authentication: TafelJwtAuthentication
    ): ScannerRegistration {
        val scannerId = abs(Random().nextInt()) // TODO generate id (atomic sequence)
        logger.info("Scanner registered - ID: $scannerId")
        return ScannerRegistration(scannerId = scannerId)
    }

    @Scheduled(fixedDelay = 5000)
    fun broadcast() {
        logger.info("BROADCAST ${counter++}")
        simpMessagingTemplate.convertAndSend("/topic/scanners/registration", ScannerRegistration(scannerId = counter))
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
