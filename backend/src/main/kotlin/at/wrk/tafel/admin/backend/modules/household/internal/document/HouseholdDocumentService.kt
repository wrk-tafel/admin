package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import at.wrk.tafel.admin.backend.database.model.household.DocumentType as DocumentTypeEntity

@Service
class HouseholdDocumentService(
    private val documentRepository: DocumentRepository,
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
    private val documentStorageService: DocumentStorageService,
    private val scannerFileService: ScannerFileService,
    private val documentScannerWatcherService: DocumentScannerWatcherService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val auditLogWriter: AuditLogWriter,
) {

    companion object {
        private val ALLOWED_CONTENT_TYPES = setOf(MediaType.APPLICATION_PDF_VALUE, MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE)
        private val IMPORT_FILE_NAME_TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm")
    }

    @Transactional
    fun uploadDocument(
        householdId: Long,
        personId: Long?,
        documentType: DocumentType,
        file: MultipartFile,
    ): DocumentItem {
        val household = findHousehold(householdId)
        val person = resolvePerson(household, personId)

        if (file.isEmpty) {
            throw BusinessRuleException("Datei ist leer!")
        }
        validateSize(file.size)
        validateContentType(file.contentType)

        val storagePath = documentStorageService.store(
            householdId = householdId,
            originalFileName = file.originalFilename ?: "dokument",
            bytes = file.bytes,
        )

        val entity = DocumentEntity(
            household = household,
            documentType = DocumentTypeEntity.valueOf(documentType.name),
            fileName = file.originalFilename ?: "dokument",
            contentType = file.contentType!!,
            storagePath = storagePath,
        ).apply {
            this.person = person
            this.uploadedByUser = currentUser()
        }

        return mapToItem(documentRepository.saveAndFlush(entity))
    }

    @Transactional
    fun importFromScannerFile(
        householdId: Long,
        fileName: String,
        personId: Long?,
        documentType: DocumentType,
    ): DocumentItem {
        val household = findHousehold(householdId)
        val person = resolvePerson(household, personId)

        val bytes = scannerFileService.read(fileName)
        val contentType = scannerFileService.resolveContentType(fileName)
        validateSize(bytes.size.toLong())
        validateContentType(contentType)

        // Scanner-generated filenames (e.g. "document_20260802_143022.pdf") are generic and, once
        // imported, would sit in the household's document list indistinguishable from any other
        // scan - derive a meaningful one from what's actually known at import time instead of
        // preserving the scanner's own name. Local uploads (uploadDocument above) keep the user's
        // own filename as-is - it's usually already meaningful, unlike a scanner's.
        val importedFileName = deriveScannerImportFileName(documentType, fileName)

        val storagePath = documentStorageService.store(
            householdId = householdId,
            originalFileName = importedFileName,
            bytes = bytes,
        )

        val entity = DocumentEntity(
            household = household,
            documentType = DocumentTypeEntity.valueOf(documentType.name),
            fileName = importedFileName,
            contentType = contentType,
            storagePath = storagePath,
        ).apply {
            this.person = person
            this.uploadedByUser = currentUser()
        }

        val savedEntity = documentRepository.saveAndFlush(entity)

        scannerFileService.delete(fileName)
        documentScannerWatcherService.publishIfChanged()

        return mapToItem(savedEntity)
    }

    @Transactional(readOnly = true)
    fun getDocuments(householdId: Long): List<DocumentItem> = documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId).map { mapToItem(it) }

    /**
     * Not read-only: a download is one of the sensitive-handful reads recorded in `audit_log` (see
     * issue #3180), and [AuditLogWriter.record]'s write only takes effect for a transaction that
     * actually commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun getDocumentFile(householdId: Long, documentId: Long): DocumentFileResult {
        val document = findDocument(householdId, documentId)
        val bytes = documentStorageService.read(document.storagePath)

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "Document",
                entityId = document.id,
                businessKey = document.household.householdId.toString(),
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )

        return DocumentFileResult(
            fileName = document.fileName,
            contentType = document.contentType,
            bytes = bytes,
        )
    }

    @Transactional
    fun deleteDocument(householdId: Long, documentId: Long) {
        val document = findDocument(householdId, documentId)
        documentStorageService.delete(document.storagePath)
        documentRepository.delete(document)
    }

    private fun findHousehold(householdId: Long): HouseholdEntity = householdRepository.findByHouseholdId(householdId)
        ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

    private fun findDocument(householdId: Long, documentId: Long) = documentRepository.findByIdAndHouseholdHouseholdId(documentId, householdId)
        ?: throw NotFoundException("Dokument Nr. $documentId nicht vorhanden!")

    private fun resolvePerson(household: HouseholdEntity, personId: Long?) = personId?.let { id ->
        household.persons.firstOrNull { it.id == id }
            ?: throw NotFoundException("Person Nr. $id nicht bei Kunde Nr. ${household.householdId} vorhanden!")
    }

    /**
     * Re-read per upload rather than kept in a field, so lowering the limit applies to the next
     * upload instead of the next restart (`ConfigFileReloadService`). The servlet container's own
     * ceiling is derived from the same value with headroom (`MultipartConfig`), which is what lets
     * this check answer with a readable message before the container refuses the request itself.
     */
    private fun validateSize(sizeBytes: Long) {
        val maxDocumentSize = tafelAdminProperties.storage.maxDocumentSize
        if (sizeBytes > maxDocumentSize.toBytes()) {
            throw BusinessRuleException("Datei ist zu groß (max. ${maxDocumentSize.toMegabytes()} MB)!")
        }
    }

    private fun validateContentType(contentType: String?) {
        if (contentType !in ALLOWED_CONTENT_TYPES) {
            throw BusinessRuleException("Dateityp wird nicht unterstützt!")
        }
    }

    private fun currentUser() = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        ?.let { userRepository.findByUsername(it) }

    private fun deriveScannerImportFileName(documentType: DocumentType, originalFileName: String): String {
        val extension = originalFileName.substringAfterLast('.', missingDelimiterValue = "")
        val timestamp = LocalDateTime.now().format(IMPORT_FILE_NAME_TIMESTAMP_FORMAT)
        val label = germanLabel(documentType)
        return if (extension.isBlank()) "${label}_$timestamp" else "${label}_$timestamp.$extension"
    }

    // ASCII-only on purpose (no umlauts) - this becomes part of a filename/Content-Disposition
    // header, not just UI text like the frontend's equivalent documentTypeLabel map.
    private fun germanLabel(documentType: DocumentType): String = when (documentType) {
        DocumentType.PROOF_OF_INCOME -> "Einkommensnachweis"
        DocumentType.ID -> "Ausweis"
        DocumentType.PRIVACY_NOTICE -> "Datenschutzerklaerung"
        DocumentType.OTHER -> "Sonstiges"
    }

    private fun mapToItem(entity: DocumentEntity): DocumentItem {
        val employee = entity.uploadedByUser?.employee
        val uploadedBy = listOfNotNull(employee?.personnelNumber, employee?.firstname, employee?.lastname)
            .joinToString(" ")
            .ifBlank { null }

        return DocumentItem(
            id = entity.id!!,
            documentType = DocumentType.valueOf(entity.documentType.name),
            fileName = entity.fileName,
            uploadedAt = entity.createdAt!!,
            uploadedBy = uploadedBy,
            personId = entity.person?.id,
        )
    }
}
