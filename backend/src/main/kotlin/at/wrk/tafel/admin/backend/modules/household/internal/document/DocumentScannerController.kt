package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
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
    private val auditLogWriter: AuditLogWriter,
) {

    @GetMapping
    fun getScannerFiles(): ScannerFileListResponse = ScannerFileListResponse(items = scannerFileService.listFiles())

    /**
     * One of the sensitive-handful reads recorded in `audit_log` (see issue #3180) - a scanned file
     * can hold the same personal data as an already-imported document, before it ever becomes one.
     * `@Transactional` (not read-only) is what makes [AuditLogWriter.record]'s write actually commit -
     * see [AuditLogWriter]'s `beforeCommit`.
     */
    @GetMapping("/{fileName}/content")
    @Transactional
    fun getScannerFileContent(@PathVariable fileName: String): ResponseEntity<InputStreamResource> {
        val bytes = scannerFileService.read(fileName)
        val contentType = scannerFileService.resolveContentType(fileName)

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.SCANNER_FILE_ENTITY_TYPE,
                entityId = null,
                businessKey = fileName,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )

        val headers = HttpHeaders()
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=$fileName")

        return ResponseEntity.ok()
            .headers(headers)
            .contentType(MediaType.parseMediaType(contentType))
            .body(InputStreamResource(ByteArrayInputStream(bytes)))
    }
}
