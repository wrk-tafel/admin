package at.wrk.tafel.admin.backend.modules.household.internal.document

import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/document-scanner-files")
@PreAuthorize("hasAuthority('CUSTOMER')")
class DocumentScannerController(
    private val scannerFileService: ScannerFileService,
) {

    @GetMapping
    fun getScannerFiles(): ScannerFileListResponse = ScannerFileListResponse(items = scannerFileService.listFiles())

    @GetMapping("/{fileName}/content")
    fun getScannerFileContent(@PathVariable fileName: String): ResponseEntity<InputStreamResource> {
        val bytes = scannerFileService.read(fileName)
        val contentType = scannerFileService.resolveContentType(fileName)

        val headers = HttpHeaders()
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=$fileName")

        return ResponseEntity.ok()
            .headers(headers)
            .contentType(MediaType.parseMediaType(contentType))
            .body(InputStreamResource(ByteArrayInputStream(bytes)))
    }
}
