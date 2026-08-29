package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.http.ContentDispositionUtil
import jakarta.validation.Valid
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/households/{householdId}/documents")
@PreAuthorize("hasAuthority('CUSTOMER_DOCUMENTS')")
class HouseholdDocumentController(
    private val service: HouseholdDocumentService,
) {

    @PostMapping
    fun uploadDocument(
        @PathVariable householdId: Long,
        @RequestParam("file") file: MultipartFile,
        @RequestParam("documentType") documentType: DocumentType,
        @RequestParam("personId", required = false) personId: Long?,
    ): ResponseEntity<DocumentItem> {
        val document = service.uploadDocument(householdId, personId, documentType, file)
        return ResponseEntity.status(HttpStatus.CREATED).body(document)
    }

    @PostMapping("/from-scanner-file")
    fun importScannerDocument(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: ImportScannerDocumentRequest,
    ): ResponseEntity<DocumentItem> {
        val document = service.importFromScannerFile(householdId, request.fileName, request.personId, request.documentType)
        return ResponseEntity.status(HttpStatus.CREATED).body(document)
    }

    @GetMapping
    fun getDocuments(@PathVariable householdId: Long): HouseholdDocumentListResponse = HouseholdDocumentListResponse(items = service.getDocuments(householdId))

    @GetMapping("/{documentId}")
    fun downloadDocument(
        @PathVariable householdId: Long,
        @PathVariable documentId: Long,
    ): ResponseEntity<InputStreamResource> {
        val result = service.getDocumentFile(householdId, documentId)

        val headers = ContentDispositionUtil.attachment(result.fileName)

        return ResponseEntity.ok()
            .headers(headers)
            .contentType(MediaType.parseMediaType(result.contentType))
            .body(InputStreamResource(ByteArrayInputStream(result.bytes)))
    }

    @DeleteMapping("/{documentId}")
    fun deleteDocument(
        @PathVariable householdId: Long,
        @PathVariable documentId: Long,
    ): ResponseEntity<Unit> {
        service.deleteDocument(householdId, documentId)
        return ResponseEntity.noContent().build()
    }
}
