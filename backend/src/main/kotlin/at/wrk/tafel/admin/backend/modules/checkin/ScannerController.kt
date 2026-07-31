package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/scanners")
@PreAuthorize("hasAnyAuthority('SCANNER', 'CHECKIN')")
class ScannerController(
    private val scannerService: ScannerService,
    private val sseOutboxService: SseOutboxService,
) {

    @GetMapping
    fun getScanners(): ScannersResponse = ScannersResponse(scannerIds = scannerService.getScannerIds())

    @PostMapping("/register")
    fun registerScanner(@RequestParam("scannerId") existingScannerId: Int?): ScannerRegistration {
        val scannerId = scannerService.registerScanner(existingScannerId)
        return ScannerRegistration(scannerId = scannerId)
    }

    @PostMapping("/{scannerId}/results")
    fun sendResult(@PathVariable scannerId: Int, @RequestParam("scanResult") scanResult: Long) {
        sseOutboxService.saveOutboxEntry(
            notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
            payload = ScanResult(
                scannerId = scannerId,
                value = scanResult,
            ),
        )
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
