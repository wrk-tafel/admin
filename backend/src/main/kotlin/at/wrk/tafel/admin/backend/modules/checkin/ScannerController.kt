package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter


@RestController
@RequestMapping("/api/scanners")
class ScannerController(
    private val scannerService: ScannerService,
    private val objectMapper: ObjectMapper,
) {

    @GetMapping
    fun getScanners(): ScannersResponse {
        return ScannersResponse(scannerIds = scannerService.getScannerIds())
    }

    @PostMapping("/register")
    fun registerScanner(@RequestParam("scannerId") existingScannerId: Int?): ScannerRegistration {
        val scannerId = scannerService.registerScanner(existingScannerId)
        return ScannerRegistration(scannerId = scannerId)
    }

    @PostMapping("/{scannerId}/results")
    fun sendResult(@PathVariable("scannerId") scannerId: Int, @RequestParam("scanResult") scanResult: Long) {
        scannerService.saveScanResult(scannerId, scanResult)
    }

    @GetMapping("/{scannerId}/results")
    fun listenForResults(@PathVariable("scannerId") scannerId: Int): SseEmitter {
        val emitter = SseEmitter()

        scannerService.listenForResults(scannerId) { scannedCustomerId ->
            val response = ScanResult(value = scannedCustomerId)

            val event = SseEmitter.event()
                .data(objectMapper.writeValueAsString(response))
            emitter.send(event)
        }

        return emitter
    }

}

@ExcludeFromTestCoverage
data class ScanResult(
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
