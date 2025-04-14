package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter


@RestController
@RequestMapping("/api")
class ScannerController(
    private val scannerService: ScannerService,
    private val sseOutboxService: SseOutboxService,
) {

    @GetMapping("/scanners")
    fun getScanners(): ScannersResponse {
        return ScannersResponse(scannerIds = scannerService.getScannerIds())
    }

    @PostMapping("/scanners/register")
    fun registerScanner(@RequestParam("scannerId") existingScannerId: Int?): ScannerRegistration {
        val scannerId = scannerService.registerScanner(existingScannerId)
        return ScannerRegistration(scannerId = scannerId)
    }

    @PostMapping("/scanners/{scannerId}/results")
    fun sendResult(@PathVariable("scannerId") scannerId: Int, @RequestParam("scanResult") scanResult: Long) {
        sseOutboxService.saveOutboxEntry(
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            payload = ScanResult(
                scannerId = scannerId,
                value = scanResult
            )
        )
    }

    @GetMapping("/sse/scanners/{scannerId}/results")
    fun listenForResults(@PathVariable("scannerId") scannerId: Int): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        val acceptFilter = { result: ScanResult? ->
            result?.scannerId == scannerId
        }
        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            resultType = ScanResult::class.java,
            acceptFilter = acceptFilter
        )

        return sseEmitter
    }

}

@ExcludeFromTestCoverage
data class ScanResult(
    val scannerId: Int,
    val value: Long,
)

@ExcludeFromTestCoverage
data class ScannerRegistration(
    val scannerId: Int,
)

@ExcludeFromTestCoverage
data class ScannersResponse(
    val scannerIds: List<Int>,
)
