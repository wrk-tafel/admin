package at.wrk.tafel.admin.backend.modules.household.internal.document

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/document-scanner-files")
@PreAuthorize("hasAuthority('CUSTOMER')")
class DocumentScannerController(
    private val scannerFileService: ScannerFileService,
) {

    @GetMapping
    fun getScannerFiles(): ScannerFileListResponse = ScannerFileListResponse(items = scannerFileService.listFiles())
}
